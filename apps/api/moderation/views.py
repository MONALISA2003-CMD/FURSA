from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from core.models import ApplicationRoute, Category, Country, Region, Source, Vacancy
from volunteers.models import AuditEvent, VolunteerProfile
from .models import SafetyReport, VacancySubmission
from .permissions import ActiveVolunteer, ReviewerOrAdmin


MAX_TEXT = 20000
ALLOWED_FIELDS = {
    "title_original", "title_en", "title_ar", "employer_name", "description_original",
    "description_en", "description_ar", "country_code", "region_id", "category_id",
    "employment_type", "work_mode", "salary_min", "salary_max", "salary_currency",
    "salary_period", "eligibility_text", "sponsorship_status", "original_posted_at",
    "deadline_at", "expires_at", "source_name", "source_url", "source_type",
    "source_permission_note", "route_type", "route_destination",
}


def audit(actor, action, object_type, object_id, details=None):
    AuditEvent.objects.create(actor=actor, action=action, object_type=object_type,
                              object_id=str(object_id), details=details or {})


def json_safe_data(data):
    """Convert typed validation values to JSON-native primitives before JSONField storage."""
    result = {}
    for key, value in data.items():
        if isinstance(value, (date, datetime)):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = str(value)
        else:
            result[key] = value
    return result


def clean_submission_payload(payload):
    if not isinstance(payload, dict):
        return None, {"data": "Submit a JSON object of vacancy fields."}
    unknown = set(payload) - ALLOWED_FIELDS
    if unknown:
        return None, {"data": f"Unsupported fields: {', '.join(sorted(unknown))}."}
    data = {}
    errors = {}
    text_fields = {
        "title_original": (255, True), "title_en": (255, False), "title_ar": (255, False),
        "employer_name": (255, False), "description_original": (MAX_TEXT, False),
        "description_en": (MAX_TEXT, False), "description_ar": (MAX_TEXT, False),
        "eligibility_text": (5000, False), "source_name": (180, True),
        "source_url": (500, True), "source_permission_note": (5000, True),
        "route_destination": (500, True), "salary_currency": (3, False),
    }
    for field, (limit, required) in text_fields.items():
        value = payload.get(field, "")
        if not isinstance(value, str):
            errors[field] = "Enter text."
            continue
        value = value.strip()
        if required and not value:
            errors[field] = "This field is required."
        elif len(value) > limit:
            errors[field] = f"Use {limit} characters or fewer."
        else:
            data[field] = value
    if len(data.get("title_original", "")) < 4:
        errors["title_original"] = "Enter a meaningful vacancy title (at least 4 characters)."

    country_code = payload.get("country_code")
    if not isinstance(country_code, str) or not Country.objects.filter(code=country_code.upper(), enabled=True).exists():
        errors["country_code"] = "Choose an enabled FURSA country."
    else:
        data["country_code"] = country_code.upper()

    for field, model, lookup in (("region_id", Region, "pk"), ("category_id", Category, "pk")):
        raw = payload.get(field)
        if raw in (None, ""):
            data[field] = None
            continue
        try:
            obj = model.objects.get(**{lookup: raw})
            if field == "region_id" and (not obj.enabled or obj.country_id != data.get("country_code")):
                raise model.DoesNotExist
            if field == "category_id" and not obj.active:
                raise model.DoesNotExist
            data[field] = obj.pk
        except (model.DoesNotExist, ValueError, TypeError):
            errors[field] = "Choose a valid active option for the selected country."

    enums = {
        "employment_type": set(Vacancy.EmploymentType.values) | {""},
        "work_mode": set(Vacancy.WorkMode.values) | {""},
        "salary_period": set(Vacancy.SalaryPeriod.values) | {""},
        "sponsorship_status": set(Vacancy.SponsorshipStatus.values),
        "source_type": set(Source.SourceType.values),
        "route_type": set(ApplicationRoute.RouteType.values),
    }
    defaults = {"employment_type": "", "work_mode": "", "salary_period": "", "sponsorship_status": "NOT_SPECIFIED", "source_type": "OTHER_PUBLIC", "route_type": "WEBSITE"}
    for field, allowed in enums.items():
        value = payload.get(field, defaults[field])
        if not isinstance(value, str) or value not in allowed:
            errors[field] = "Choose a valid option."
        else:
            data[field] = value

    parsed_source = urlsplit(data.get("source_url", ""))
    if parsed_source.scheme != "https" or not parsed_source.hostname:
        errors["source_url"] = "The supporting source must use a valid HTTPS URL."
    destination = data.get("route_destination", "")
    parsed_route = urlsplit(destination)
    route_type = data.get("route_type")
    route_ok = (
        route_type == ApplicationRoute.RouteType.WEBSITE and parsed_route.scheme == "https" and bool(parsed_route.hostname)
    ) or (
        route_type == ApplicationRoute.RouteType.EMAIL and parsed_route.scheme == "mailto" and bool(parsed_route.path) and not any(c.isspace() for c in destination)
    ) or (
        route_type == ApplicationRoute.RouteType.WHATSAPP and parsed_route.scheme == "https" and parsed_route.hostname in {"wa.me", "api.whatsapp.com"}
    )
    if not route_ok:
        errors["route_destination"] = "Use HTTPS for websites, mailto: for email, or an approved HTTPS WhatsApp link."

    for field in ("salary_min", "salary_max"):
        raw = payload.get(field)
        if raw in (None, ""):
            data[field] = None
        else:
            try:
                value = Decimal(str(raw))
                if not value.is_finite() or value < 0 or value > Decimal("9999999999.99"):
                    raise InvalidOperation
                data[field] = value
            except (InvalidOperation, ValueError, TypeError):
                errors[field] = "Enter a valid non-negative amount."
    if data.get("salary_min") is not None and data.get("salary_max") is not None and data["salary_min"] > data["salary_max"]:
        errors["salary_max"] = "Salary maximum must be greater than or equal to salary minimum."

    for field in ("original_posted_at", "deadline_at", "expires_at"):
        raw = payload.get(field)
        if raw in (None, ""):
            data[field] = None
        elif not isinstance(raw, str):
            errors[field] = "Use an ISO date or date-time."
        elif field == "original_posted_at":
            parsed = parse_date(raw)
            if parsed is None:
                errors[field] = "Use YYYY-MM-DD."
            else:
                data[field] = parsed
        else:
            parsed = parse_datetime(raw)
            if parsed is None:
                errors[field] = "Use an ISO date-time including timezone, for example 2027-01-31T23:59:00+00:00."
            else:
                if timezone.is_naive(parsed):
                    errors[field] = "Include a timezone in the date-time."
                else:
                    data[field] = parsed
    if data.get("expires_at") and data["expires_at"] <= timezone.now():
        errors["expires_at"] = "A new vacancy cannot be submitted with an expiry in the past."
    if data.get("deadline_at") and data["deadline_at"] <= timezone.now():
        errors["deadline_at"] = "A vacancy with a deadline in the past cannot be published."
    return (None, errors) if errors else (data, {})


def submission_payload(item):
    return {"id": str(item.pk), "data": item.data, "status": item.status,
            "review_note": item.review_note, "contributor_email": item.contributor.email,
            "reviewer_email": item.reviewer.email if item.reviewer_id else None,
            "vacancy_id": str(item.vacancy_id) if item.vacancy_id else None,
            "submitted_at": item.submitted_at, "reviewed_at": item.reviewed_at,
            "created_at": item.created_at, "updated_at": item.updated_at}


def report_payload(item):
    return {"id": item.pk, "vacancy_id": str(item.vacancy_id),
            "vacancy_title": item.vacancy.title_en or item.vacancy.title_ar or item.vacancy.title_original,
            "vacancy_status": item.vacancy.status, "reason": item.reason, "details": item.details,
            "status": item.status, "resolution_note": item.resolution_note,
            "reviewed_by": item.reviewed_by.email if item.reviewed_by_id else None,
            "created_at": item.created_at, "updated_at": item.updated_at}


class SubmissionListCreateView(APIView):
    permission_classes = [ActiveVolunteer]

    def get(self, request):
        profile = request.user.volunteer_profile
        rows = VacancySubmission.objects.select_related("contributor", "reviewer", "vacancy")
        if profile.role == VolunteerProfile.Role.CONTRIBUTOR:
            rows = rows.filter(contributor=request.user)
        return Response({"results": [submission_payload(x) for x in rows[:100]]})

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        data, errors = clean_submission_payload(request.data.get("data", request.data))
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        item = VacancySubmission.objects.create(contributor=request.user, data=json_safe_data(data))
        audit(request.user, "vacancy_submission.created", "VacancySubmission", item.pk)
        return Response(submission_payload(item), status=status.HTTP_201_CREATED)


class SubmissionDetailView(APIView):
    permission_classes = [ActiveVolunteer]

    def get_object(self, request, pk):
        item = VacancySubmission.objects.select_related("contributor", "reviewer", "vacancy").filter(pk=pk).first()
        if item is None:
            return None, Response({"detail": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
        profile = request.user.volunteer_profile
        if profile.role == VolunteerProfile.Role.CONTRIBUTOR and item.contributor_id != request.user.pk:
            return None, Response({"detail": "You can only access your own submissions."}, status=status.HTTP_403_FORBIDDEN)
        return item, None

    def get(self, request, pk):
        item, error = self.get_object(request, pk)
        return error or Response(submission_payload(item))

    @transaction.atomic
    def patch(self, request, pk):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        item, error = self.get_object(request, pk)
        if error:
            return error
        if item.contributor_id != request.user.pk:
            return Response({"detail": "Only the submission owner can edit this draft."}, status=status.HTTP_403_FORBIDDEN)
        if item.status not in {VacancySubmission.Status.DRAFT, VacancySubmission.Status.CHANGES_REQUESTED}:
            return Response({"detail": "Only drafts or submissions returned for changes can be edited."}, status=status.HTTP_409_CONFLICT)
        data, errors = clean_submission_payload(request.data.get("data", request.data))
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        item.data = json_safe_data(data)
        item.status = VacancySubmission.Status.DRAFT
        item.review_note = ""
        item.save(update_fields=["data", "status", "review_note", "updated_at"])
        audit(request.user, "vacancy_submission.updated", "VacancySubmission", item.pk)
        return Response(submission_payload(item))


class SubmissionSubmitView(APIView):
    permission_classes = [ActiveVolunteer]

    @transaction.atomic
    def post(self, request, pk):
        item = VacancySubmission.objects.select_for_update().filter(pk=pk, contributor=request.user).first()
        if item is None:
            return Response({"detail": "Submission not found or not owned by you."}, status=status.HTTP_404_NOT_FOUND)
        if item.status not in {VacancySubmission.Status.DRAFT, VacancySubmission.Status.CHANGES_REQUESTED}:
            return Response({"detail": "Only a draft can be submitted for review."}, status=status.HTTP_409_CONFLICT)
        data, errors = clean_submission_payload(item.data)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        item.data = json_safe_data(data)
        item.status = VacancySubmission.Status.SUBMITTED
        item.submitted_at = timezone.now()
        item.review_note = ""
        item.save(update_fields=["data", "status", "submitted_at", "review_note", "updated_at"])
        audit(request.user, "vacancy_submission.submitted", "VacancySubmission", item.pk)
        return Response(submission_payload(item))


class ReviewQueueView(APIView):
    permission_classes = [ReviewerOrAdmin]

    def get(self, request):
        rows = VacancySubmission.objects.filter(status=VacancySubmission.Status.SUBMITTED).select_related("contributor")[:100]
        return Response({"results": [submission_payload(x) for x in rows]})


class ReviewDecisionView(APIView):
    permission_classes = [ReviewerOrAdmin]

    @transaction.atomic
    def post(self, request, pk):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        item = VacancySubmission.objects.select_for_update().select_related("contributor").filter(pk=pk).first()
        if item is None:
            return Response({"detail": "Submission not found."}, status=status.HTTP_404_NOT_FOUND)
        if item.status != VacancySubmission.Status.SUBMITTED:
            return Response({"detail": "Only submitted vacancies can receive a review decision."}, status=status.HTTP_409_CONFLICT)
        if item.contributor_id == request.user.pk:
            return Response({"detail": "You cannot approve or review your own submission."}, status=status.HTTP_403_FORBIDDEN)
        decision = request.data.get("decision")
        note = request.data.get("note", "")
        if not isinstance(decision, str) or decision not in {"approve", "request_changes", "reject"}:
            return Response({"decision": "Choose approve, request_changes, or reject."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(note, str) or len(note) > 4000:
            return Response({"note": "Use 4000 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        if not note.strip():
            return Response({"note": "A clear review note is required for every decision."}, status=status.HTTP_400_BAD_REQUEST)

        vacancy = None
        if decision == "approve":
            data, errors = clean_submission_payload(item.data)
            if errors:
                return Response({"detail": "Submission failed publication validation.", "errors": errors}, status=status.HTTP_400_BAD_REQUEST)
            country = Country.objects.get(code=data["country_code"], enabled=True)
            region = Region.objects.filter(pk=data.get("region_id"), enabled=True, country=country).first() if data.get("region_id") else None
            category = Category.objects.filter(pk=data.get("category_id"), active=True).first() if data.get("category_id") else None
            source = Source(
                name=data["source_name"], source_url=data["source_url"], source_type=data["source_type"],
                permission_note=data["source_permission_note"], source_last_checked_at=timezone.now(),
            )
            try:
                source.full_clean()
                source.save()
                vacancy = Vacancy(
                    title_original=data["title_original"], title_en=data.get("title_en", ""), title_ar=data.get("title_ar", ""),
                    employer_name=data.get("employer_name", ""), description_original=data.get("description_original", ""),
                    description_en=data.get("description_en", ""), description_ar=data.get("description_ar", ""),
                    country=country, region=region, category=category, employment_type=data.get("employment_type", ""),
                    work_mode=data.get("work_mode", ""), salary_min=data.get("salary_min"), salary_max=data.get("salary_max"),
                    salary_currency=data.get("salary_currency", ""), salary_period=data.get("salary_period", ""),
                    eligibility_text=data.get("eligibility_text", ""), sponsorship_status=data.get("sponsorship_status", "NOT_SPECIFIED"),
                    original_posted_at=data.get("original_posted_at"), deadline_at=data.get("deadline_at"), expires_at=data.get("expires_at"),
                    status=Vacancy.Status.PUBLISHED, published_at=timezone.now(), last_checked_at=timezone.now(),
                )
                vacancy.full_clean()
                vacancy.save()
                vacancy.sources.add(source)
                route = ApplicationRoute(
                    vacancy=vacancy, route_type=data["route_type"], destination=data["route_destination"],
                    supporting_source=source, status=ApplicationRoute.RouteStatus.OK, last_checked_at=timezone.now(),
                )
                route.full_clean()
                route.save()
            except DjangoValidationError as exc:
                transaction.set_rollback(True)
                return Response({"detail": "Publication safety checks failed.", "errors": getattr(exc, "message_dict", {"validation": exc.messages})}, status=status.HTTP_400_BAD_REQUEST)
            item.vacancy = vacancy
            item.status = VacancySubmission.Status.APPROVED
        elif decision == "request_changes":
            item.status = VacancySubmission.Status.CHANGES_REQUESTED
        else:
            item.status = VacancySubmission.Status.REJECTED
        item.reviewer = request.user
        item.review_note = note.strip()
        item.reviewed_at = timezone.now()
        item.save(update_fields=["vacancy", "status", "reviewer", "review_note", "reviewed_at", "updated_at"])
        audit(request.user, f"vacancy_submission.{decision}", "VacancySubmission", item.pk,
              {"vacancy_id": str(vacancy.pk) if vacancy else None, "note": item.review_note})
        return Response(submission_payload(item))


class AnonymousReportThrottle(AnonRateThrottle):
    scope = "public_reports"


class SafetyReportListCreateView(APIView):
    throttle_classes = [AnonymousReportThrottle]

    def get_permissions(self):
        if self.request.method == "POST":
            return [AllowAny()]
        return [ReviewerOrAdmin()]

    def get(self, request):
        rows = SafetyReport.objects.select_related("vacancy", "reviewed_by")[:200]
        return Response({"results": [report_payload(x) for x in rows]})

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        raw_id = request.data.get("vacancy_id")
        reason = request.data.get("reason")
        details = request.data.get("details", "")
        try:
            vacancy = Vacancy.objects.get(pk=raw_id, status__in=[Vacancy.Status.PUBLISHED, Vacancy.Status.SUSPENDED, Vacancy.Status.EXPIRED, Vacancy.Status.CLOSED])
        except (Vacancy.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "We could not match that vacancy to a report."}, status=status.HTTP_400_BAD_REQUEST)
        if reason not in SafetyReport.Reason.values:
            return Response({"reason": "Choose a valid report reason."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(details, str) or len(details) > 2000:
            return Response({"details": "Use 2000 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        report = SafetyReport.objects.create(vacancy=vacancy, reason=reason, details=details.strip())
        audit(None, "safety_report.created", "SafetyReport", report.pk, {"vacancy_id": str(vacancy.pk), "reason": reason})
        return Response({"id": report.pk, "status": report.status, "detail": "Thank you. Your report has been sent for review."}, status=status.HTTP_201_CREATED)


class SafetyReportDecisionView(APIView):
    permission_classes = [ReviewerOrAdmin]

    @transaction.atomic
    def post(self, request, pk):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        report = SafetyReport.objects.select_for_update().select_related("vacancy").filter(pk=pk).first()
        if report is None:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        decision = request.data.get("decision")
        note = request.data.get("note", "")
        if not isinstance(decision, str) or decision not in {"investigate", "resolve", "dismiss", "suspend"}:
            return Response({"decision": "Choose investigate, resolve, dismiss, or suspend."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(note, str) or len(note) > 2000:
            return Response({"note": "Use 2000 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        if decision in {"resolve", "dismiss", "suspend"} and not note.strip():
            return Response({"note": "A reason is required to resolve, dismiss, or suspend."}, status=status.HTTP_400_BAD_REQUEST)
        if decision == "investigate":
            report.status = SafetyReport.Status.INVESTIGATING
        elif decision == "resolve":
            report.status = SafetyReport.Status.RESOLVED
        elif decision == "dismiss":
            report.status = SafetyReport.Status.DISMISSED
        else:
            if report.vacancy.status == Vacancy.Status.PUBLISHED:
                report.vacancy.status = Vacancy.Status.SUSPENDED
                report.vacancy.save(update_fields=["status", "updated_at"])
            report.status = SafetyReport.Status.RESOLVED
            report.resolution_note = f"Vacancy suspended: {note.strip()}"
        report.reviewed_by = request.user
        if decision != "suspend":
            report.resolution_note = note.strip()
        report.save(update_fields=["status", "resolution_note", "reviewed_by", "updated_at"])
        audit(request.user, f"safety_report.{decision}", "SafetyReport", report.pk,
              {"vacancy_id": str(report.vacancy_id), "reason": report.reason, "note": note.strip(), "vacancy_status": report.vacancy.status})
        return Response(report_payload(report))

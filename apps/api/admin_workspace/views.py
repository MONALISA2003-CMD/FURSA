import os
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import ApplicationRoute, Category, Country, Region, Source, Vacancy
from volunteers.models import AuditEvent, VolunteerInvitation, VolunteerProfile
from volunteers.views import InvitationListCreateView, InvitationRevokeView, VolunteerDashboardView, VolunteerTeamView, VolunteerTeamMemberUpdateView, _audit
from .permissions import ActiveFursaAdmin, FounderOnly, is_fursa_founder

User = get_user_model()


def _audit_job(actor, action, vacancy, details=None):
    AuditEvent.objects.create(actor=actor, action=action, object_type="Vacancy", object_id=str(vacancy.pk), details=details or {})


def _json_decimal(value):
    return str(value) if value is not None else None


def _job_payload(vacancy):
    source = vacancy.sources.order_by("created_at").first()
    route = vacancy.application_routes.order_by("created_at").first()
    return {
        "id": str(vacancy.pk), "title_original": vacancy.title_original,
        "title_en": vacancy.title_en, "title_ar": vacancy.title_ar,
        "employer_name": vacancy.employer_name,
        "description_original": vacancy.description_original,
        "description_en": vacancy.description_en, "description_ar": vacancy.description_ar,
        "country_code": vacancy.country_id, "region_id": vacancy.region_id,
        "region_name_en": vacancy.region.name_en if vacancy.region_id else "",
        "region_code": vacancy.region.code if vacancy.region_id else "",
        "category_id": vacancy.category_id,
        "category_slug": vacancy.category.slug if vacancy.category_id else "",
        "employment_type": vacancy.employment_type, "work_mode": vacancy.work_mode,
        "salary_min": _json_decimal(vacancy.salary_min), "salary_max": _json_decimal(vacancy.salary_max),
        "salary_currency": vacancy.salary_currency, "salary_period": vacancy.salary_period,
        "eligibility_text": vacancy.eligibility_text, "sponsorship_status": vacancy.sponsorship_status,
        "original_posted_at": vacancy.original_posted_at.isoformat() if vacancy.original_posted_at else "",
        "deadline_at": vacancy.deadline_at.isoformat() if vacancy.deadline_at else "",
        "expires_at": vacancy.expires_at.isoformat() if vacancy.expires_at else "",
        "status": vacancy.status, "published_at": vacancy.published_at.isoformat() if vacancy.published_at else None,
        "last_checked_at": vacancy.last_checked_at.isoformat() if vacancy.last_checked_at else None,
        "source_name": source.name if source else "", "source_url": source.source_url if source else "",
        "source_type": source.source_type if source else Source.SourceType.EMPLOYER_CAREERS,
        "source_permission_note": source.permission_note if source else "",
        "route_type": route.route_type if route else ApplicationRoute.RouteType.WEBSITE,
        "route_destination": route.destination if route else "",
        "application_verified": bool(route and route.status == ApplicationRoute.RouteStatus.OK),
        "created_at": vacancy.created_at.isoformat(), "updated_at": vacancy.updated_at.isoformat(),
    }


def _parse_optional_date(value, field):
    if value in (None, ""):
        return None
    parsed = parse_date(value) if isinstance(value, str) else None
    if not parsed:
        raise ValueError(f"{field} must be a valid YYYY-MM-DD date.")
    return parsed


def _parse_optional_datetime(value, field):
    if value in (None, ""):
        return None
    parsed = parse_datetime(value) if isinstance(value, str) else None
    if not parsed:
        raise ValueError(f"{field} must be a valid date and time.")
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def _optional_decimal(value, field):
    if value in (None, ""):
        return None
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field} must be a valid number.")
    if not number.is_finite() or number < 0:
        raise ValueError(f"{field} must be a non-negative number.")
    return number


def _validate_https_url(value, field):
    parsed = urlsplit(value.strip() if isinstance(value, str) else "")
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"{field} must be a valid HTTPS URL.")
    return value.strip()


def _apply_job_data(vacancy, data, actor, publish=False):
    # UUIDField assigns a primary key at construction time, before the row exists.
    # `_state.adding` is the reliable signal for deciding whether related rows can
    # be queried or foreign keys validated against the database.
    is_new_vacancy = vacancy._state.adding
    if not isinstance(data, dict):
        raise ValueError("Job data must be an object.")
    title = str(data.get("title_original") or data.get("title_en") or "").strip()
    employer = str(data.get("employer_name") or "").strip()
    description = str(data.get("description_original") or data.get("description_en") or "").strip()
    country_code = str(data.get("country_code") or "").strip().upper()
    if not title:
        raise ValueError("Enter a job title.")
    if len(title) > 255:
        raise ValueError("Job titles must be 255 characters or fewer.")
    title_en = str(data.get("title_en") or title).strip()
    title_ar = str(data.get("title_ar") or "").strip()
    if len(title_en) > 255 or len(title_ar) > 255:
        raise ValueError("English and Arabic job titles must be 255 characters or fewer.")
    if len(employer) > 255:
        raise ValueError("Employer names must be 255 characters or fewer.")
    if not country_code:
        raise ValueError("Choose a country.")
    country = Country.objects.filter(pk=country_code, enabled=True).first()
    if not country:
        raise ValueError("Choose an enabled FURSA country.")
    if publish and (not employer or not description):
        raise ValueError("Employer and full job description are required before publishing.")

    region = None
    region_id = data.get("region_id")
    if region_id not in (None, ""):
        if isinstance(region_id, str) and not region_id.isdigit():
            region = Region.objects.filter(code=region_id, country=country, enabled=True).first()
        else:
            region = Region.objects.filter(pk=region_id, country=country, enabled=True).first()
        if not region:
            raise ValueError("Choose a region belonging to the selected country.")
    category = None
    category_id = data.get("category_id")
    if category_id not in (None, ""):
        if isinstance(category_id, str) and not category_id.isdigit():
            category = Category.objects.filter(slug=category_id, active=True).first()
        else:
            category = Category.objects.filter(pk=category_id, active=True).first()
        if not category:
            raise ValueError("Choose an active job category.")

    employment = str(data.get("employment_type") or "").strip().upper()
    work_mode = str(data.get("work_mode") or "").strip().upper()
    salary_period = str(data.get("salary_period") or "").strip().upper()
    sponsorship = str(data.get("sponsorship_status") or Vacancy.SponsorshipStatus.NOT_SPECIFIED).strip().upper()
    if employment and employment not in Vacancy.EmploymentType.values:
        raise ValueError("Choose a valid employment type.")
    if work_mode and work_mode not in Vacancy.WorkMode.values:
        raise ValueError("Choose a valid workplace arrangement.")
    if publish and (not employment or not work_mode):
        raise ValueError("Choose the employment type and workplace arrangement before publishing.")
    if salary_period and salary_period not in Vacancy.SalaryPeriod.values:
        raise ValueError("Choose a valid salary period.")
    if sponsorship not in Vacancy.SponsorshipStatus.values:
        raise ValueError("Choose a valid sponsorship status.")
    salary_min = _optional_decimal(data.get("salary_min"), "Minimum salary")
    salary_max = _optional_decimal(data.get("salary_max"), "Maximum salary")
    if salary_min is not None and salary_max is not None and salary_min > salary_max:
        raise ValueError("Minimum salary cannot exceed maximum salary.")
    currency = str(data.get("salary_currency") or "").strip().upper()
    if currency and (len(currency) != 3 or not currency.isalpha()):
        raise ValueError("Salary currency must be a three-letter code.")
    if publish and (salary_min is not None or salary_max is not None) and not currency:
        raise ValueError("Choose the salary currency when entering a salary range.")

    source_name = str(data.get("source_name") or employer).strip()
    source_url = str(data.get("source_url") or "").strip()
    source_type = str(data.get("source_type") or Source.SourceType.EMPLOYER_CAREERS).strip().upper()
    permission_note = str(data.get("source_permission_note") or "").strip()
    route_type = str(data.get("route_type") or ApplicationRoute.RouteType.WEBSITE).strip().upper()
    route_destination = str(data.get("route_destination") or "").strip()
    verified = data.get("application_verified") is True or data.get("application_verified") in ("true", "1", 1)
    source = None
    if source_url:
        source_url = _validate_https_url(source_url, "Official source URL")
        if len(source_url) > 500:
            raise ValueError("Official source URLs must be 500 characters or fewer.")
        if len(source_name) > 180:
            raise ValueError("Source names must be 180 characters or fewer.")
        if source_type not in Source.SourceType.values:
            raise ValueError("Choose a valid source type.")
        if not source_name:
            raise ValueError("Enter the source or employer name.")
        source = None if is_new_vacancy else vacancy.sources.order_by("created_at").first()
        if source:
            source.name = source_name
            source.source_url = source_url
            source.source_type = source_type
            source.permission_note = permission_note
            source.source_last_checked_at = timezone.now() if publish else source.source_last_checked_at
            source.save()
        else:
            source = Source.objects.create(name=source_name, source_url=source_url, source_type=source_type,
                                           permission_note=permission_note, source_last_checked_at=timezone.now() if publish else None)
    elif publish:
        raise ValueError("Add the official HTTPS vacancy source URL before publishing.")

    route = None if is_new_vacancy else vacancy.application_routes.order_by("created_at").first()
    if route_destination:
        if len(route_destination) > 500:
            raise ValueError("Application destinations must be 500 characters or fewer.")
        if route_type not in ApplicationRoute.RouteType.values:
            raise ValueError("Choose a valid application method.")
        if not source:
            raise ValueError("Add the official source before the application destination.")
        route = route or ApplicationRoute(vacancy=vacancy, route_type=route_type, destination=route_destination, supporting_source=source)
        route.route_type = route_type
        route.destination = route_destination
        route.supporting_source = source
        route.status = ApplicationRoute.RouteStatus.OK if verified else ApplicationRoute.RouteStatus.NEEDS_REVIEW
        if verified:
            route.last_checked_at = timezone.now()
        try:
            route.full_clean(exclude=["vacancy"] if is_new_vacancy else [])
        except DjangoValidationError as exc:
            raise ValueError("Application destination is invalid: " + "; ".join(exc.messages))
    elif publish:
        raise ValueError("Add an application destination before publishing.")
    if publish and not verified:
        raise ValueError("Confirm that you checked the application destination before publishing.")

    vacancy.title_original = title
    vacancy.title_en = title_en
    vacancy.title_ar = title_ar
    vacancy.employer_name = employer
    vacancy.description_original = description
    vacancy.description_en = str(data.get("description_en") or description).strip()
    vacancy.description_ar = str(data.get("description_ar") or "").strip()
    vacancy.country = country
    vacancy.region = region
    vacancy.category = category
    vacancy.employment_type = employment
    vacancy.work_mode = work_mode
    vacancy.salary_min = salary_min
    vacancy.salary_max = salary_max
    vacancy.salary_currency = currency
    vacancy.salary_period = salary_period
    vacancy.eligibility_text = str(data.get("eligibility_text") or "").strip()
    vacancy.sponsorship_status = sponsorship
    vacancy.original_posted_at = _parse_optional_date(data.get("original_posted_at"), "Original publication date")
    vacancy.deadline_at = _parse_optional_datetime(data.get("deadline_at"), "Closing date")
    vacancy.expires_at = _parse_optional_datetime(data.get("expires_at"), "Expiry date")
    if publish and vacancy.deadline_at and vacancy.deadline_at <= timezone.now():
        raise ValueError("This vacancy's closing date has passed. Confirm the employer still accepts applications before publishing.")
    if publish and vacancy.expires_at and vacancy.expires_at <= timezone.now():
        raise ValueError("Choose a future expiry or re-check date before publishing.")
    if publish:
        vacancy.status = Vacancy.Status.PUBLISHED
        vacancy.published_at = vacancy.published_at or timezone.now()
        vacancy.last_checked_at = timezone.now()
    elif is_new_vacancy:
        vacancy.status = Vacancy.Status.DRAFT
    try:
        vacancy.full_clean(exclude=["sources"])
    except DjangoValidationError as exc:
        raise ValueError("Job details need correction: " + "; ".join(exc.messages))
    vacancy.save()
    if source:
        vacancy.sources.add(source)
    if route:
        route.vacancy = vacancy
        route.supporting_source = source
        route.save()
    return vacancy


class FounderAwareDashboardView(VolunteerDashboardView):
    permission_classes = [ActiveFursaAdmin]

    def get(self, request):
        response = super().get(request)
        if response.status_code != 200 or not isinstance(response.data, dict):
            return response
        founder = is_fursa_founder(request.user)
        response.data["is_founder"] = founder
        response.data["user"]["role"] = VolunteerProfile.Role.ADMIN
        response.data["capabilities"] = {
            "can_submit_vacancies": True, "can_review_vacancies": True,
            "can_manage_jobs": True, "can_manage_team": founder,
            "can_invite_admins": founder,
        }
        return response


class FounderInvitationListCreateView(InvitationListCreateView):
    permission_classes = [FounderOnly]

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        raw_email = request.data.get("email")
        email = raw_email.strip().casefold() if isinstance(raw_email, str) else ""
        if not email:
            return Response({"email": "Enter an email address."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({"email": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": "An account already exists for this email."}, status=status.HTTP_409_CONFLICT)
        now = timezone.now()
        older_pending = VolunteerInvitation.objects.select_for_update().filter(
            email__iexact=email, accepted_at__isnull=True, revoked_at__isnull=True, expires_at__gt=now)
        for older in older_pending:
            older.revoked_at = now
            older.save(update_fields=["revoked_at"])
            _audit(request.user, "volunteer.invitation.superseded", "VolunteerInvitation", older.pk, {"email": email})
        invitation, raw_token = VolunteerInvitation.issue(
            email=email, role=VolunteerProfile.Role.ADMIN, invited_by=request.user, lifetime_hours=24)
        _audit(request.user, "volunteer.invitation.created", "VolunteerInvitation", invitation.pk,
               {"email": email, "role": VolunteerProfile.Role.ADMIN, "expires_in_hours": 24})
        locale = request.data.get("locale", "en")
        if not isinstance(locale, str) or locale not in {"en", "ar"}:
            locale = "en"
        return Response({"id": invitation.pk, "email": invitation.email, "role": "ADMIN",
                         "expires_at": invitation.expires_at, "delivery": "manual_share",
                         "invitation_url": f"/{locale}/volunteer/sign-in?invitation={raw_token}"}, status=status.HTTP_201_CREATED)


class FounderInvitationRevokeView(InvitationRevokeView):
    permission_classes = [FounderOnly]


class FounderTeamView(VolunteerTeamView):
    permission_classes = [FounderOnly]

    def get(self, request):
        rows = VolunteerProfile.objects.select_related("user").order_by("user__email")[:200]
        return Response({"results": [{"id": p.pk, "name": p.user.get_full_name() or p.user.email,
            "email": p.user.email, "role": "ADMIN", "status": p.status,
            "is_founder": is_fursa_founder(p.user)} for p in rows]})


class FounderTeamMemberUpdateView(VolunteerTeamMemberUpdateView):
    permission_classes = [FounderOnly]

    @transaction.atomic
    def post(self, request, pk):
        profile = VolunteerProfile.objects.select_for_update().select_related("user").filter(pk=pk).first()
        if not profile:
            return Response({"detail": "Admin account not found."}, status=status.HTTP_404_NOT_FOUND)
        if is_fursa_founder(profile.user):
            return Response({"detail": "Founder access cannot be changed from the volunteer dashboard."}, status=status.HTTP_409_CONFLICT)
        state = request.data.get("status", profile.status)
        if not isinstance(state, str) or state not in {VolunteerProfile.Status.ACTIVE, VolunteerProfile.Status.SUSPENDED, VolunteerProfile.Status.REVOKED}:
            return Response({"status": "Choose a valid account status."}, status=status.HTTP_400_BAD_REQUEST)
        before = {"status": profile.status, "user_active": profile.user.is_active}
        profile.role = VolunteerProfile.Role.ADMIN
        profile.status = state
        profile.user.is_active = state == VolunteerProfile.Status.ACTIVE
        profile.save(update_fields=["role", "status", "updated_at"])
        profile.user.save(update_fields=["is_active"])
        _audit(request.user, "volunteer.admin_access.updated", "VolunteerProfile", profile.pk,
               {"email": profile.user.email, "before": before, "after": {"status": state}})
        return Response({"id": profile.pk, "role": "ADMIN", "status": profile.status})


class PasswordResetRequestInfoView(APIView):
    """Do not reveal account existence or return reset tokens from a public endpoint.

    Until a verified sender domain is configured, the founder issues a reset link
    from the authenticated team dashboard and shares it privately.
    """
    permission_classes = []

    def post(self, request):
        return Response({"detail": "For account security, contact the FURSA founder to receive a private password-reset link."})


class FounderPasswordResetLinkView(APIView):
    permission_classes = [FounderOnly]

    def post(self, request, pk):
        profile = VolunteerProfile.objects.select_related("user").filter(pk=pk).first()
        if not profile or profile.status != VolunteerProfile.Status.ACTIVE or not profile.user.is_active:
            return Response({"detail": "An active admin account was not found."}, status=status.HTTP_404_NOT_FOUND)
        if is_fursa_founder(profile.user):
            return Response({"detail": "Use the founder account's normal password recovery process."}, status=status.HTTP_409_CONFLICT)
        uid = urlsafe_base64_encode(force_bytes(profile.user.pk))
        token = default_token_generator.make_token(profile.user)
        locale = request.data.get("locale", "en") if isinstance(request.data, dict) else "en"
        if not isinstance(locale, str) or locale not in {"en", "ar"}:
            locale = "en"
        reset_url = f"/{locale}/volunteer/reset-password?uid={uid}&token={token}"
        _audit(request.user, "volunteer.admin_password_link.created", "VolunteerProfile", profile.pk,
               {"email": profile.user.email, "expires_in_seconds": getattr(settings, "PASSWORD_RESET_TIMEOUT", 259200)})
        return Response({"email": profile.user.email, "reset_url": reset_url,
                         "expires_in_seconds": getattr(settings, "PASSWORD_RESET_TIMEOUT", 259200),
                         "delivery": "manual_share"})


class JobCollectionView(APIView):
    permission_classes = [ActiveFursaAdmin]

    def get(self, request):
        rows = Vacancy.objects.select_related("country", "region", "category").prefetch_related("sources", "application_routes")[:300]
        return Response({"results": [_job_payload(v) for v in rows]})

    @transaction.atomic
    def post(self, request):
        data = request.data.get("data", request.data)
        publish = request.data.get("status") == Vacancy.Status.PUBLISHED or request.data.get("publish") is True
        vacancy = Vacancy()
        try:
            _apply_job_data(vacancy, data, request.user, publish=publish)
        except (ValueError, DjangoValidationError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        _audit_job(request.user, "vacancy.published" if publish else "vacancy.draft_created", vacancy,
                   {"title": vacancy.title_original, "country": vacancy.country_id})
        return Response(_job_payload(vacancy), status=status.HTTP_201_CREATED)


class JobDetailView(APIView):
    permission_classes = [ActiveFursaAdmin]

    def get_object(self, pk):
        return Vacancy.objects.select_related("country", "region", "category").prefetch_related("sources", "application_routes").filter(pk=pk).first()

    def get(self, request, pk):
        vacancy = self.get_object(pk)
        if not vacancy:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_job_payload(vacancy))

    @transaction.atomic
    def patch(self, request, pk):
        vacancy = self.get_object(pk)
        if not vacancy:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        data = request.data.get("data", request.data)
        publish = request.data.get("status") == Vacancy.Status.PUBLISHED or request.data.get("publish") is True
        before = vacancy.status
        try:
            _apply_job_data(vacancy, data, request.user, publish=publish)
        except (ValueError, DjangoValidationError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        _audit_job(request.user, "vacancy.published" if publish else "vacancy.updated", vacancy,
                   {"title": vacancy.title_original, "previous_status": before, "status": vacancy.status})
        return Response(_job_payload(vacancy))


class JobStatusView(APIView):
    permission_classes = [ActiveFursaAdmin]

    @transaction.atomic
    def post(self, request, pk):
        vacancy = Vacancy.objects.select_for_update().filter(pk=pk).first()
        if not vacancy:
            return Response({"detail": "Job not found."}, status=status.HTTP_404_NOT_FOUND)
        new_status = str(request.data.get("status") or "").strip().upper()
        reason = str(request.data.get("reason") or "").strip()
        allowed = {Vacancy.Status.CLOSED, Vacancy.Status.SUSPENDED, Vacancy.Status.EXPIRED}
        if new_status not in allowed:
            return Response({"status": "Choose a valid status action."}, status=status.HTTP_400_BAD_REQUEST)
        if new_status == Vacancy.Status.SUSPENDED and not reason:
            return Response({"reason": "Enter a reason when suspending a job."}, status=status.HTTP_400_BAD_REQUEST)
        before = vacancy.status
        vacancy.status = new_status
        if new_status == Vacancy.Status.PUBLISHED:
            vacancy.published_at = vacancy.published_at or timezone.now()
            vacancy.last_checked_at = timezone.now()
        vacancy.save(update_fields=["status", "published_at", "last_checked_at", "updated_at"])
        _audit_job(request.user, f"vacancy.status_{new_status.lower()}", vacancy,
                   {"previous_status": before, "reason": reason})
        return Response(_job_payload(vacancy))

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import ApplicationRoute, Category, Country, Source, Vacancy
from volunteers.models import AuditEvent, VolunteerProfile
from .models import SafetyReport, VacancySubmission

User = get_user_model()


def payload():
    return {
        "title_original": "Verified Warehouse Supervisor", "title_en": "Warehouse Supervisor", "title_ar": "مشرف مستودع",
        "employer_name": "Verified Employer", "description_en": "Manage day-to-day warehouse operations.",
        "country_code": "AE", "employment_type": "FULL_TIME", "work_mode": "ONSITE",
        "source_name": "Employer careers page", "source_url": "https://careers.example.test/jobs",
        "source_type": "EMPLOYER_CAREERS", "source_permission_note": "Source checked by an admin.",
        "route_type": "WEBSITE", "route_destination": "https://careers.example.test/jobs/warehouse-supervisor",
    }


class ModerationWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.country = Country.objects.get(code="AE")
        self.category = Category.objects.get(slug="it-software")
        self.contributor = User.objects.create_user(username="contributor@example.test", email="contributor@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=self.contributor, role=VolunteerProfile.Role.ADMIN)
        self.reviewer = User.objects.create_user(username="reviewer@example.test", email="reviewer@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=self.reviewer, role=VolunteerProfile.Role.ADMIN)

    def test_legacy_submission_can_be_reviewed_by_any_admin(self):
        self.client.force_authenticate(self.contributor)
        created = self.client.post("/api/v1/moderation/submissions/", {"data": payload()}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        submission_id = created.data["id"]
        submitted = self.client.post(f"/api/v1/moderation/submissions/{submission_id}/submit/")
        self.assertEqual(submitted.status_code, 200, submitted.data)
        self.assertEqual(submitted.data["status"], VacancySubmission.Status.SUBMITTED)
        self.client.force_authenticate(self.reviewer)
        queue = self.client.get("/api/v1/moderation/review-queue/")
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(len(queue.data["results"]), 1)
        approved = self.client.post(f"/api/v1/moderation/review-queue/{submission_id}/decision/", {"decision": "approve", "note": "Source and application route verified."}, format="json")
        self.assertEqual(approved.status_code, 200, approved.data)
        self.assertEqual(approved.data["status"], VacancySubmission.Status.APPROVED)
        vacancy = Vacancy.objects.get(pk=approved.data["vacancy_id"])
        self.assertEqual(vacancy.status, Vacancy.Status.PUBLISHED)
        self.assertTrue(vacancy.sources.exists())
        route = vacancy.application_routes.get()
        self.assertEqual(route.status, ApplicationRoute.RouteStatus.OK)
        self.assertEqual(route.supporting_source_id, vacancy.sources.get().pk)

    def test_admin_cannot_review_own_submission(self):
        self.client.force_authenticate(self.contributor)
        created = self.client.post("/api/v1/moderation/submissions/", {"data": payload()}, format="json")
        self.client.post(f"/api/v1/moderation/submissions/{created.data['id']}/submit/")
        response = self.client.post(f"/api/v1/moderation/review-queue/{created.data['id']}/decision/", {"decision": "approve"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_any_active_admin_can_access_legacy_review_queue(self):
        self.client.force_authenticate(self.contributor)
        response = self.client.get("/api/v1/moderation/review-queue/")
        self.assertEqual(response.status_code, 200)

    def test_public_report_does_not_automatically_suspend_vacancy(self):
        source = Source.objects.create(name="Employer source", source_url="https://careers.example.test", source_last_checked_at=timezone.now())
        vacancy = Vacancy.objects.create(title_original="Current job", title_en="Current job", country=self.country, category=self.category, status=Vacancy.Status.PUBLISHED, published_at=timezone.now(), last_checked_at=timezone.now())
        vacancy.sources.add(source)
        ApplicationRoute.objects.create(vacancy=vacancy, route_type=ApplicationRoute.RouteType.WEBSITE, destination="https://careers.example.test/jobs/1", supporting_source=source, status=ApplicationRoute.RouteStatus.OK, last_checked_at=timezone.now())
        response = self.client.post("/api/v1/moderation/reports/", {"vacancy_id": str(vacancy.pk), "reason": "SUSPICIOUS", "details": "The source may be misleading."}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        vacancy.refresh_from_db()
        self.assertEqual(vacancy.status, Vacancy.Status.PUBLISHED)
        self.assertEqual(SafetyReport.objects.count(), 1)

    def test_admin_can_suspend_with_reason_and_audit_event(self):
        source = Source.objects.create(name="Employer source", source_url="https://careers.example.test", source_last_checked_at=timezone.now())
        vacancy = Vacancy.objects.create(title_original="Current job", title_en="Current job", country=self.country, status=Vacancy.Status.PUBLISHED, published_at=timezone.now(), last_checked_at=timezone.now())
        vacancy.sources.add(source)
        ApplicationRoute.objects.create(vacancy=vacancy, route_type=ApplicationRoute.RouteType.WEBSITE, destination="https://careers.example.test/jobs/1", supporting_source=source, status=ApplicationRoute.RouteStatus.OK, last_checked_at=timezone.now())
        report = SafetyReport.objects.create(vacancy=vacancy, reason=SafetyReport.Reason.SUSPICIOUS)
        self.client.force_authenticate(self.reviewer)
        response = self.client.post(f"/api/v1/moderation/reports/{report.pk}/decision/", {"decision": "suspend", "note": "Evidence suggests the application destination is fraudulent."}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        vacancy.refresh_from_db()
        self.assertEqual(vacancy.status, Vacancy.Status.SUSPENDED)
        self.assertEqual(self.client.get(f"/api/v1/jobs/{vacancy.pk}/").status_code, 404)
        self.assertIn("fraudulent", response.data["resolution_note"])

import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from core.models import Country, Region, Source, Vacancy
from volunteers.models import VolunteerInvitation, VolunteerProfile

User = get_user_model()


class RevisedAdminModelTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.founder = User.objects.create_superuser(username="founder@example.test", email="founder@example.test", password="Founder-Password!2026")
        VolunteerProfile.objects.create(user=self.founder, role=VolunteerProfile.Role.ADMIN)
        self.volunteer = User.objects.create_user(username="volunteer@example.test", email="volunteer@example.test", password="Volunteer-Password!2026")
        VolunteerProfile.objects.create(user=self.volunteer, role=VolunteerProfile.Role.CONTRIBUTOR)
        Country.objects.get_or_create(code="AE", defaults={"name_en": "United Arab Emirates", "name_ar": "الإمارات العربية المتحدة", "enabled": True})

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_only_founder_can_invite_and_invites_always_create_admins(self):
        self.client.force_authenticate(self.volunteer)
        denied = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test", "role": "ADMIN"}, format="json")
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.founder)
        created = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test", "role": "CONTRIBUTOR", "locale": "en"}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        invitation = VolunteerInvitation.objects.get(email="new@example.test")
        self.assertEqual(invitation.role, VolunteerProfile.Role.ADMIN)
        self.assertIn("invitation=", created.data["invitation_url"])
        self.assertGreater((invitation.expires_at - invitation.created_at).total_seconds(), 23.9 * 3600)
        self.assertLess((invitation.expires_at - invitation.created_at).total_seconds(), 24 * 3600)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_dashboard_shows_invitation_capability_only_to_founder(self):
        self.client.force_authenticate(self.founder)
        founder = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertTrue(founder.data["capabilities"]["can_invite_admins"])
        self.client.force_authenticate(self.volunteer)
        volunteer = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertFalse(volunteer.data["capabilities"]["can_invite_admins"])
        self.assertTrue(volunteer.data["capabilities"]["can_manage_jobs"])


    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_founder_can_issue_manual_password_reset_link(self):
        self.client.force_authenticate(self.founder)
        response = self.client.post(f"/api/v1/volunteer/team/{self.volunteer.volunteer_profile.pk}/password-reset-link/", {"locale": "en"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertIn("/volunteer/reset-password?uid=", response.data["reset_url"])
        self.assertIn("token=", response.data["reset_url"])

    def test_unconfigured_founder_fails_closed(self):
        with patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": ""}):
            self.client.force_authenticate(self.founder)
            response = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_active_volunteer_can_create_a_published_job_with_verified_links(self):
        self.client.force_authenticate(self.volunteer)
        payload = {
            "status": "PUBLISHED",
            "data": {
                "title_original": "Registered Nurse", "title_en": "Registered Nurse",
                "employer_name": "Example Hospital", "description_original": "Provide nursing care.",
                "country_code": "AE", "employment_type": "FULL_TIME", "work_mode": "ONSITE",
                "source_name": "Example Hospital Careers", "source_url": "https://example.com/careers/nurse",
                "source_type": "EMPLOYER_CAREERS", "route_type": "WEBSITE",
                "route_destination": "https://example.com/apply/nurse", "application_verified": True,
            },
        }
        response = self.client.post("/api/v1/moderation/jobs/", payload, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], Vacancy.Status.PUBLISHED)
        self.assertEqual(Vacancy.objects.count(), 1)
        self.assertTrue(Vacancy.objects.first().application_routes.exists())

    def test_job_publish_requires_source_and_application_verification(self):
        self.client.force_authenticate(self.volunteer)
        response = self.client.post("/api/v1/moderation/jobs/", {
            "status": "PUBLISHED", "data": {"title_original": "Nurse", "employer_name": "Hospital", "description_original": "Care", "country_code": "AE"}
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Vacancy.objects.count(), 0)

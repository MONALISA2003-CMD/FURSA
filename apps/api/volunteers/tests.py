from urllib.parse import urlparse, parse_qs
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import AuditEvent, VolunteerInvitation, VolunteerProfile

User = get_user_model()


class VolunteerAuthFoundationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.admin = User.objects.create_user(username="admin@example.test", email="admin@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=self.admin, role=VolunteerProfile.Role.ADMIN)

    def test_anonymous_user_cannot_access_volunteer_dashboard(self):
        response = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertEqual(response.status_code, 403)

    def test_password_login_requires_active_volunteer_profile(self):
        outsider = User.objects.create_user(username="outsider@example.test", email="outsider@example.test", password="StrongPassword!123")
        response = self.client.post("/api/v1/volunteer/auth/login/", {"email": outsider.email, "password": "StrongPassword!123"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse("user" in response.data)

    def test_invitation_token_is_stored_as_hash_and_acceptance_is_single_use(self):
        invitation, raw = VolunteerInvitation.issue(email="new@example.test", role=VolunteerProfile.Role.CONTRIBUTOR, invited_by=self.admin)
        self.assertNotEqual(invitation.token_hash, raw)
        self.assertEqual(invitation.token_hash, VolunteerInvitation.hash_token(raw))
        self.assertTrue(invitation.is_pending)
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        self.assertFalse(invitation.is_pending)

    @override_settings(DEBUG=True)
    def test_admin_can_create_development_invitation(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/v1/volunteer/invitations/", {"email": "volunteer@example.test", "role": "CONTRIBUTOR"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("invitation_url", response.data)
        self.assertTrue(VolunteerInvitation.objects.filter(email="volunteer@example.test").exists())

    def test_non_admin_cannot_create_invitation(self):
        contributor = User.objects.create_user(username="contributor@example.test", email="contributor@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=contributor, role=VolunteerProfile.Role.CONTRIBUTOR)
        self.client.force_authenticate(contributor)
        response = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_audit_events_are_append_only(self):
        event = AuditEvent.objects.create(actor=self.admin, action="test.created", object_type="test", object_id="1")
        event.action = "test.changed"
        with self.assertRaises(ValidationError):
            event.save()
        with self.assertRaises(ValidationError):
            event.delete()
        with self.assertRaises(ValidationError):
            AuditEvent.objects.filter(pk=event.pk).update(action="test.bulk_changed")
        with self.assertRaises(ValidationError):
            AuditEvent.objects.filter(pk=event.pk).delete()


    def test_invitation_acceptance_creates_contributor_and_cannot_be_reused(self):
        invitation, raw = VolunteerInvitation.issue(email="new@example.test", role=VolunteerProfile.Role.CONTRIBUTOR, invited_by=self.admin)
        response = self.client.post("/api/v1/volunteer/auth/accept-invitation/", {
            "token": raw,
            "email": "new@example.test",
            "password": "Distinctive-Password-2026!",
            "first_name": "New",
            "last_name": "Volunteer",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        profile = VolunteerProfile.objects.get(user__email="new@example.test")
        self.assertEqual(profile.role, VolunteerProfile.Role.CONTRIBUTOR)
        self.assertEqual(profile.status, VolunteerProfile.Status.ACTIVE)
        reused = self.client.post("/api/v1/volunteer/auth/accept-invitation/", {
            "token": raw, "email": "new@example.test", "password": "Another-Distinctive-Password-2026!"
        }, format="json")
        self.assertEqual(reused.status_code, 400)

    def test_suspended_volunteer_cannot_access_dashboard(self):
        contributor = User.objects.create_user(username="suspended@example.test", email="suspended@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=contributor, role=VolunteerProfile.Role.CONTRIBUTOR, status=VolunteerProfile.Status.SUSPENDED)
        self.client.force_authenticate(contributor)
        response = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertEqual(response.status_code, 403)


    @override_settings(DEBUG=True)
    def test_password_reset_link_is_development_only_and_updates_password(self):
        volunteer = User.objects.create_user(username="reset@example.test", email="reset@example.test", password="Original-Strong-Password-2026!")
        VolunteerProfile.objects.create(user=volunteer, role=VolunteerProfile.Role.CONTRIBUTOR)
        response = self.client.post("/api/v1/volunteer/auth/password-reset/request/", {"email": volunteer.email, "locale": "en"}, format="json")
        self.assertEqual(response.status_code, 200)
        query = parse_qs(urlparse(response.data["reset_url"]).query)
        uid, token = query["uid"][0], query["token"][0]
        changed = self.client.post("/api/v1/volunteer/auth/password-reset/confirm/", {"uid": uid, "token": token, "password": "Another-Strong-Password-2026!"}, format="json")
        self.assertEqual(changed.status_code, 200, changed.data)
        volunteer.refresh_from_db()
        self.assertTrue(volunteer.check_password("Another-Strong-Password-2026!"))

    @override_settings(DEBUG=False)
    def test_password_reset_request_fails_closed_without_production_email(self):
        response = self.client.post("/api/v1/volunteer/auth/password-reset/request/", {"email": "anyone@example.test"}, format="json")
        self.assertEqual(response.status_code, 503)


    @override_settings(DEBUG=False)
    def test_production_invitation_creation_fails_closed_until_email_is_configured(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test", "role": "CONTRIBUTOR"}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertFalse(VolunteerInvitation.objects.filter(email="new@example.test").exists())

    def test_admin_cannot_change_own_role_or_status(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/v1/volunteer/team/" + str(VolunteerProfile.objects.get(user=self.admin).pk) + "/update/", {"role": "CONTRIBUTOR", "status": "ACTIVE"}, format="json")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.admin.volunteer_profile.role, VolunteerProfile.Role.ADMIN)

    def test_admin_can_change_another_volunteers_role(self):
        contributor = User.objects.create_user(username="member@example.test", email="member@example.test", password="StrongPassword!123")
        profile = VolunteerProfile.objects.create(user=contributor, role=VolunteerProfile.Role.CONTRIBUTOR)
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/volunteer/team/{profile.pk}/update/", {"role": "REVIEWER", "status": "ACTIVE"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        profile.refresh_from_db()
        self.assertEqual(profile.role, VolunteerProfile.Role.REVIEWER)

    def test_google_login_fails_closed_without_client_id(self):
        with patch.dict("os.environ", {"GOOGLE_OAUTH_CLIENT_ID": ""}):
            response = self.client.post("/api/v1/volunteer/auth/google/", {"credential": "not-a-real-token"}, format="json")
        self.assertEqual(response.status_code, 503)

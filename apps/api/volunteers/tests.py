import os
from urllib.parse import urlparse, parse_qs
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import AuditEvent, VolunteerInvitation, VolunteerProfile

User = get_user_model()


class VolunteerAuthFoundationTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.admin = User.objects.create_user(username="founder@example.test", email="founder@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=self.admin, role=VolunteerProfile.Role.ADMIN)
        self.member = User.objects.create_user(username="member@example.test", email="member@example.test", password="StrongPassword!123")
        VolunteerProfile.objects.create(user=self.member, role=VolunteerProfile.Role.ADMIN)

    def test_anonymous_user_cannot_access_volunteer_dashboard(self):
        response = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertEqual(response.status_code, 403)

    def test_password_login_requires_active_volunteer_profile(self):
        outsider = User.objects.create_user(username="outsider@example.test", email="outsider@example.test", password="StrongPassword!123")
        response = self.client.post("/api/v1/volunteer/auth/login/", {"email": outsider.email, "password": "StrongPassword!123"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertNotIn("user", response.data)

    def test_invitation_token_is_stored_as_hash_and_single_use(self):
        invitation, raw = VolunteerInvitation.issue(email="new@example.test", role=VolunteerProfile.Role.ADMIN, invited_by=self.admin)
        self.assertNotEqual(invitation.token_hash, raw)
        self.assertEqual(invitation.token_hash, VolunteerInvitation.hash_token(raw))
        self.assertTrue(invitation.is_pending)
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=["accepted_at"])
        self.assertFalse(invitation.is_pending)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_founder_can_create_admin_invitation_without_email_service(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/v1/volunteer/invitations/", {"email": "new@example.test", "role": "CONTRIBUTOR"}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        invitation = VolunteerInvitation.objects.get(email="new@example.test")
        self.assertEqual(invitation.role, VolunteerProfile.Role.ADMIN)
        self.assertIn("invitation_url", response.data)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_other_admin_cannot_invite_an_admin(self):
        self.client.force_authenticate(self.member)
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

    def test_invitation_acceptance_creates_admin_and_cannot_be_reused(self):
        invitation, raw = VolunteerInvitation.issue(email="new@example.test", role=VolunteerProfile.Role.ADMIN, invited_by=self.admin)
        response = self.client.post("/api/v1/volunteer/auth/accept-invitation/", {
            "token": raw, "email": "new@example.test", "password": "Distinctive-Password-2026!", "first_name": "New", "last_name": "Volunteer",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        profile = VolunteerProfile.objects.get(user__email="new@example.test")
        self.assertEqual(profile.role, VolunteerProfile.Role.ADMIN)
        self.assertEqual(profile.status, VolunteerProfile.Status.ACTIVE)
        reused = self.client.post("/api/v1/volunteer/auth/accept-invitation/", {"token": raw, "email": "new@example.test", "password": "Another-Distinctive-Password-2026!"}, format="json")
        self.assertEqual(reused.status_code, 400)

    def test_suspended_admin_cannot_access_dashboard(self):
        self.member.volunteer_profile.status = VolunteerProfile.Status.SUSPENDED
        self.member.volunteer_profile.save(update_fields=["status"])
        self.client.force_authenticate(self.member)
        response = self.client.get("/api/v1/volunteer/dashboard/")
        self.assertEqual(response.status_code, 403)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_founder_issues_manual_reset_link_that_updates_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/volunteer/team/{self.member.volunteer_profile.pk}/password-reset-link/", {"locale": "en"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        query = parse_qs(urlparse(response.data["reset_url"]).query)
        changed = self.client.post("/api/v1/volunteer/auth/password-reset/confirm/", {
            "uid": query["uid"][0], "token": query["token"][0], "password": "Another-Strong-Password-2026!"
        }, format="json")
        self.assertEqual(changed.status_code, 200, changed.data)
        self.member.refresh_from_db()
        self.assertTrue(self.member.check_password("Another-Strong-Password-2026!"))

    def test_public_password_reset_request_never_returns_a_token(self):
        response = self.client.post("/api/v1/volunteer/auth/password-reset/request/", {"email": self.member.email}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("reset_url", response.data)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_founder_cannot_change_own_account_access(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/volunteer/team/{self.admin.volunteer_profile.pk}/update/", {"status": "REVOKED"}, format="json")
        self.assertEqual(response.status_code, 409)

    @patch.dict(os.environ, {"FURSA_FOUNDER_EMAIL": "founder@example.test"})
    def test_founder_can_deactivate_an_admin_but_not_change_role_hierarchy(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/v1/volunteer/team/{self.member.volunteer_profile.pk}/update/", {"role": "REVIEWER", "status": "REVOKED"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.member.refresh_from_db()
        self.member.volunteer_profile.refresh_from_db()
        self.assertEqual(self.member.volunteer_profile.role, VolunteerProfile.Role.ADMIN)
        self.assertEqual(self.member.volunteer_profile.status, VolunteerProfile.Status.REVOKED)
        self.assertFalse(self.member.is_active)

    def test_google_login_fails_closed_without_client_id(self):
        with patch.dict(os.environ, {"GOOGLE_OAUTH_CLIENT_ID": ""}):
            response = self.client.post("/api/v1/volunteer/auth/google/", {"credential": "not-a-real-token"}, format="json")
        self.assertEqual(response.status_code, 503)

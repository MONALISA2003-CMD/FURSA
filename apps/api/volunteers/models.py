import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class VolunteerProfile(models.Model):
    class Role(models.TextChoices):
        CONTRIBUTOR = "CONTRIBUTOR", "Contributor"
        REVIEWER = "REVIEWER", "Reviewer"
        ADMIN = "ADMIN", "Admin"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"
        REVOKED = "REVOKED", "Revoked"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="volunteer_profile")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.CONTRIBUTOR)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_username()} — {self.get_role_display()} ({self.status})"


class VolunteerInvitation(models.Model):
    email = models.EmailField(max_length=254, db_index=True)
    role = models.CharField(max_length=16, choices=VolunteerProfile.Role.choices, default=VolunteerProfile.Role.CONTRIBUTOR)
    token_hash = models.CharField(max_length=64, unique=True, editable=False)
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="volunteer_invitations_created")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="volunteer_invitations_accepted")
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("email", "expires_at"), name="fursa_invite_email_exp_idx")]

    @staticmethod
    def hash_token(raw_token):
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    @classmethod
    def issue(cls, *, email, role, invited_by, lifetime_hours=72):
        raw_token = secrets.token_urlsafe(32)
        invitation = cls.objects.create(
            email=email.strip().casefold(),
            role=role,
            token_hash=cls.hash_token(raw_token),
            invited_by=invited_by,
            expires_at=timezone.now() + timedelta(hours=lifetime_hours),
        )
        return invitation, raw_token

    @property
    def is_pending(self):
        return self.accepted_at is None and self.revoked_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invitation for {self.email} ({self.role})"


class AppendOnlyQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Audit events are append-only and cannot be changed.")

    def delete(self):
        raise ValidationError("Audit events are append-only and cannot be deleted.")


class AuditEventManager(models.Manager.from_queryset(AppendOnlyQuerySet)):
    pass


class AuditEvent(models.Model):
    objects = AuditEventManager()

    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="fursa_audit_events")
    action = models.CharField(max_length=80, db_index=True)
    object_type = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("object_type", "object_id", "created_at"), name="fursa_audit_object_idx")]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Audit events are append-only and cannot be changed.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events are append-only and cannot be deleted.")

    def __str__(self):
        return f"{self.action} — {self.object_type}:{self.object_id}"

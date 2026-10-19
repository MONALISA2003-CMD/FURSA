import uuid

from django.conf import settings
from django.db import models

from core.models import Vacancy


class VacancySubmission(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SUBMITTED = "SUBMITTED", "Submitted for review"
        CHANGES_REQUESTED = "CHANGES_REQUESTED", "Changes requested"
        REJECTED = "REJECTED", "Rejected"
        APPROVED = "APPROVED", "Approved and published"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contributor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="vacancy_submissions")
    data = models.JSONField(default=dict)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT, db_index=True)
    review_note = models.TextField(blank=True)
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="vacancy_reviews")
    vacancy = models.OneToOneField(Vacancy, on_delete=models.PROTECT, null=True, blank=True, related_name="moderation_submission")
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        indexes = [models.Index(fields=("status", "submitted_at"), name="fursa_sub_status_sub_idx")]


class SafetyReport(models.Model):
    class Reason(models.TextChoices):
        SUSPICIOUS = "SUSPICIOUS", "Suspicious or potentially fraudulent"
        EXPIRED = "EXPIRED", "Expired vacancy"
        INCORRECT = "INCORRECT", "Incorrect information"
        BROKEN_LINK = "BROKEN_LINK", "Broken application link"
        OTHER = "OTHER", "Other problem"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        INVESTIGATING = "INVESTIGATING", "Investigating"
        RESOLVED = "RESOLVED", "Resolved"
        DISMISSED = "DISMISSED", "Dismissed"

    id = models.BigAutoField(primary_key=True)
    vacancy = models.ForeignKey(Vacancy, on_delete=models.PROTECT, related_name="safety_reports")
    reason = models.CharField(max_length=20, choices=Reason.choices, db_index=True)
    details = models.TextField(blank=True, max_length=2000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    resolution_note = models.TextField(blank=True, max_length=2000)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="safety_reports_reviewed")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("status", "-created_at")
        indexes = [models.Index(fields=("status", "reason", "created_at"), name="fursa_report_queue_idx")]

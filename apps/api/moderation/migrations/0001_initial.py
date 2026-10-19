import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0003_seed_regions"),
    ]
    operations = [
        migrations.CreateModel(
            name="SafetyReport",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("reason", models.CharField(choices=[("SUSPICIOUS", "Suspicious or potentially fraudulent"), ("EXPIRED", "Expired vacancy"), ("INCORRECT", "Incorrect information"), ("BROKEN_LINK", "Broken application link"), ("OTHER", "Other problem")], db_index=True, max_length=20)),
                ("details", models.TextField(blank=True, max_length=2000)),
                ("status", models.CharField(choices=[("OPEN", "Open"), ("INVESTIGATING", "Investigating"), ("RESOLVED", "Resolved"), ("DISMISSED", "Dismissed")], db_index=True, default="OPEN", max_length=16)),
                ("resolution_note", models.TextField(blank=True, max_length=2000)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="safety_reports_reviewed", to=settings.AUTH_USER_MODEL)),
                ("vacancy", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="safety_reports", to="core.vacancy")),
            ],
            options={"ordering": ("status", "-created_at")},
        ),
        migrations.CreateModel(
            name="VacancySubmission",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("data", models.JSONField(default=dict)),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("SUBMITTED", "Submitted for review"), ("CHANGES_REQUESTED", "Changes requested"), ("REJECTED", "Rejected"), ("APPROVED", "Approved and published")], db_index=True, default="DRAFT", max_length=24)),
                ("review_note", models.TextField(blank=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("contributor", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="vacancy_submissions", to=settings.AUTH_USER_MODEL)),
                ("reviewer", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="vacancy_reviews", to=settings.AUTH_USER_MODEL)),
                ("vacancy", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="moderation_submission", to="core.vacancy")),
            ],
            options={"ordering": ("-updated_at",)},
        ),
        migrations.AddIndex(model_name="safetyreport", index=models.Index(fields=["status", "reason", "created_at"], name="fursa_report_queue_idx")),
        migrations.AddIndex(model_name="vacancysubmission", index=models.Index(fields=["status", "submitted_at"], name="fursa_sub_status_sub_idx")),
    ]

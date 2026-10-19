import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="VolunteerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("CONTRIBUTOR", "Contributor"), ("REVIEWER", "Reviewer"), ("ADMIN", "Admin")], default="CONTRIBUTOR", max_length=16)),
                ("status", models.CharField(choices=[("ACTIVE", "Active"), ("SUSPENDED", "Suspended"), ("REVOKED", "Revoked")], db_index=True, default="ACTIVE", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="volunteer_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="VolunteerInvitation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254)),
                ("role", models.CharField(choices=[("CONTRIBUTOR", "Contributor"), ("REVIEWER", "Reviewer"), ("ADMIN", "Admin")], default="CONTRIBUTOR", max_length=16)),
                ("token_hash", models.CharField(editable=False, max_length=64, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                ("accepted_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="volunteer_invitations_accepted", to=settings.AUTH_USER_MODEL)),
                ("invited_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="volunteer_invitations_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(db_index=True, max_length=80)),
                ("object_type", models.CharField(max_length=100)),
                ("object_id", models.CharField(blank=True, max_length=100)),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="fursa_audit_events", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ("-created_at",)},
        ),
        migrations.AddIndex(model_name="volunteerinvitation", index=models.Index(fields=["email", "expires_at"], name="fursa_invite_email_exp_idx")),
        migrations.AddIndex(model_name="auditevent", index=models.Index(fields=["object_type", "object_id", "created_at"], name="fursa_audit_object_idx")),
    ]

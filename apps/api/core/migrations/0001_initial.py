import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Country",
            fields=[
                ("code", models.CharField(max_length=2, primary_key=True, serialize=False)),
                ("name_en", models.CharField(max_length=120)),
                ("name_ar", models.CharField(max_length=120)),
                ("enabled", models.BooleanField(default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
            ],
            options={"ordering": ("sort_order", "name_en"), "verbose_name_plural": "countries"},
        ),
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("name_en", models.CharField(max_length=120)),
                ("name_ar", models.CharField(max_length=120)),
                ("active", models.BooleanField(default=True)),
            ],
            options={"ordering": ("name_en",), "verbose_name_plural": "categories"},
        ),
        migrations.CreateModel(
            name="Source",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=180)),
                ("source_url", models.URLField(max_length=500)),
                ("source_type", models.CharField(choices=[("EMPLOYER_CAREERS", "Employer careers page"), ("AUTHORIZED_RECRUITER", "Authorized recruiter"), ("OTHER_PUBLIC", "Other public source")], default="OTHER_PUBLIC", max_length=32)),
                ("permission_note", models.TextField(blank=True)),
                ("original_text", models.TextField(blank=True)),
                ("source_last_checked_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("name",)},
        ),
        migrations.CreateModel(
            name="Region",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64)),
                ("name_en", models.CharField(max_length=120)),
                ("name_ar", models.CharField(max_length=120)),
                ("enabled", models.BooleanField(default=True)),
                ("country", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="regions", to="core.country")),
            ],
            options={"ordering": ("country_id", "name_en")},
        ),
        migrations.CreateModel(
            name="Vacancy",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title_original", models.CharField(max_length=255)),
                ("title_en", models.CharField(blank=True, max_length=255)),
                ("title_ar", models.CharField(blank=True, max_length=255)),
                ("employer_name", models.CharField(blank=True, max_length=255)),
                ("description_original", models.TextField(blank=True)),
                ("description_en", models.TextField(blank=True)),
                ("description_ar", models.TextField(blank=True)),
                ("employment_type", models.CharField(blank=True, choices=[("FULL_TIME", "Full-time"), ("PART_TIME", "Part-time"), ("CONTRACT", "Contract"), ("TEMPORARY", "Temporary"), ("INTERNSHIP", "Internship"), ("OTHER", "Other")], max_length=24)),
                ("work_mode", models.CharField(blank=True, choices=[("ONSITE", "On-site"), ("HYBRID", "Hybrid"), ("REMOTE", "Remote")], max_length=16)),
                ("salary_min", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("salary_max", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("salary_currency", models.CharField(blank=True, max_length=3)),
                ("salary_period", models.CharField(blank=True, choices=[("HOURLY", "Hourly"), ("DAILY", "Daily"), ("MONTHLY", "Monthly"), ("ANNUAL", "Annual"), ("OTHER", "Other")], max_length=16)),
                ("eligibility_text", models.TextField(blank=True)),
                ("sponsorship_status", models.CharField(choices=[("OFFERED", "Offered"), ("NOT_OFFERED", "Not offered"), ("NOT_SPECIFIED", "Not specified")], default="NOT_SPECIFIED", max_length=20)),
                ("original_posted_at", models.DateField(blank=True, null=True)),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("last_checked_at", models.DateTimeField(blank=True, null=True)),
                ("deadline_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("DRAFT", "Draft"), ("PUBLISHED", "Published"), ("SUSPENDED", "Suspended"), ("EXPIRED", "Expired"), ("CLOSED", "Closed")], db_index=True, default="DRAFT", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="vacancies", to="core.category")),
                ("country", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="vacancies", to="core.country")),
                ("region", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="vacancies", to="core.region")),
                ("sources", models.ManyToManyField(blank=True, related_name="vacancies", to="core.source")),
            ],
            options={
                "ordering": ("-published_at", "-received_at"),
                "indexes": [
                    models.Index(fields=["status", "country"], name="fursa_vac_stat_country_idx"),
                    models.Index(fields=["status", "expires_at"], name="fursa_vac_stat_expires_idx"),
                    models.Index(fields=["country", "category"], name="fursa_vac_country_cat_idx"),
                ],
                "constraints": [models.CheckConstraint(condition=models.Q(salary_min__isnull=True) | models.Q(salary_max__isnull=True) | models.Q(salary_min__lte=models.F("salary_max")), name="fursa_salary_min_lte_max")],
            },
        ),
        migrations.CreateModel(
            name="ApplicationRoute",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("route_type", models.CharField(choices=[("WEBSITE", "Employer/recruiter website"), ("EMAIL", "Email"), ("WHATSAPP", "WhatsApp")], max_length=16)),
                ("destination", models.CharField(max_length=500)),
                ("last_checked_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("NEEDS_REVIEW", "Needs review"), ("OK", "Checked and available"), ("BROKEN", "Broken"), ("SUSPICIOUS", "Suspicious")], db_index=True, default="NEEDS_REVIEW", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("supporting_source", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="application_routes", to="core.source")),
                ("vacancy", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="application_routes", to="core.vacancy")),
            ],
            options={"ordering": ("route_type",), "indexes": [models.Index(fields=["vacancy", "status"], name="fursa_route_vac_status_idx")]},
        ),
        migrations.AddConstraint(
            model_name="region",
            constraint=models.UniqueConstraint(fields=("country", "code"), name="fursa_region_country_code_uniq"),
        ),
    ]

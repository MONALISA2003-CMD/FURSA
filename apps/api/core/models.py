import uuid
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class Country(models.Model):
    code = models.CharField(max_length=2, primary_key=True)
    name_en = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "name_en")
        verbose_name_plural = "countries"

    def __str__(self):
        return f"{self.name_en} ({self.code})"


class Region(models.Model):
    country = models.ForeignKey(Country, on_delete=models.PROTECT, related_name="regions")
    code = models.CharField(max_length=64)
    name_en = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ("country_id", "name_en")
        constraints = [
            models.UniqueConstraint(fields=("country", "code"), name="fursa_region_country_code_uniq"),
        ]

    def __str__(self):
        return f"{self.name_en}, {self.country_id}"


class Category(models.Model):
    slug = models.SlugField(max_length=80, unique=True)
    name_en = models.CharField(max_length=120)
    name_ar = models.CharField(max_length=120)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name_en",)
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name_en


class Source(models.Model):
    class SourceType(models.TextChoices):
        EMPLOYER_CAREERS = "EMPLOYER_CAREERS", "Employer careers page"
        AUTHORIZED_RECRUITER = "AUTHORIZED_RECRUITER", "Authorized recruiter"
        OTHER_PUBLIC = "OTHER_PUBLIC", "Other public source"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=180)
    source_url = models.URLField(max_length=500)
    source_type = models.CharField(max_length=32, choices=SourceType.choices, default=SourceType.OTHER_PUBLIC)
    permission_note = models.TextField(blank=True)
    original_text = models.TextField(blank=True)
    source_last_checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Vacancy(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PUBLISHED = "PUBLISHED", "Published"
        SUSPENDED = "SUSPENDED", "Suspended"
        EXPIRED = "EXPIRED", "Expired"
        CLOSED = "CLOSED", "Closed"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Full-time"
        PART_TIME = "PART_TIME", "Part-time"
        CONTRACT = "CONTRACT", "Contract"
        TEMPORARY = "TEMPORARY", "Temporary"
        INTERNSHIP = "INTERNSHIP", "Internship"
        OTHER = "OTHER", "Other"

    class WorkMode(models.TextChoices):
        ONSITE = "ONSITE", "On-site"
        HYBRID = "HYBRID", "Hybrid"
        REMOTE = "REMOTE", "Remote"

    class SponsorshipStatus(models.TextChoices):
        OFFERED = "OFFERED", "Offered"
        NOT_OFFERED = "NOT_OFFERED", "Not offered"
        NOT_SPECIFIED = "NOT_SPECIFIED", "Not specified"

    class SalaryPeriod(models.TextChoices):
        HOURLY = "HOURLY", "Hourly"
        DAILY = "DAILY", "Daily"
        MONTHLY = "MONTHLY", "Monthly"
        ANNUAL = "ANNUAL", "Annual"
        OTHER = "OTHER", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title_original = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    title_ar = models.CharField(max_length=255, blank=True)
    employer_name = models.CharField(max_length=255, blank=True)
    description_original = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    country = models.ForeignKey(Country, on_delete=models.PROTECT, related_name="vacancies")
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="vacancies", null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name="vacancies", null=True, blank=True)
    employment_type = models.CharField(max_length=24, choices=EmploymentType.choices, blank=True)
    work_mode = models.CharField(max_length=16, choices=WorkMode.choices, blank=True)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=3, blank=True)
    salary_period = models.CharField(max_length=16, choices=SalaryPeriod.choices, blank=True)
    eligibility_text = models.TextField(blank=True)
    sponsorship_status = models.CharField(
        max_length=20, choices=SponsorshipStatus.choices, default=SponsorshipStatus.NOT_SPECIFIED
    )
    original_posted_at = models.DateField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    deadline_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    sources = models.ManyToManyField(Source, related_name="vacancies", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at", "-received_at")
        indexes = [
            models.Index(fields=("status", "country"), name="fursa_vac_stat_country_idx"),
            models.Index(fields=("status", "expires_at"), name="fursa_vac_stat_expires_idx"),
            models.Index(fields=("country", "category"), name="fursa_vac_country_cat_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(salary_min__isnull=True) | Q(salary_max__isnull=True) | Q(salary_min__lte=F("salary_max")),
                name="fursa_salary_min_lte_max",
            ),
        ]

    def __str__(self):
        return self.title_en or self.title_ar or self.title_original


class ApplicationRoute(models.Model):
    class RouteType(models.TextChoices):
        WEBSITE = "WEBSITE", "Employer/recruiter website"
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "WhatsApp"

    class RouteStatus(models.TextChoices):
        NEEDS_REVIEW = "NEEDS_REVIEW", "Needs review"
        OK = "OK", "Checked and available"
        BROKEN = "BROKEN", "Broken"
        SUSPICIOUS = "SUSPICIOUS", "Suspicious"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE, related_name="application_routes")
    route_type = models.CharField(max_length=16, choices=RouteType.choices)
    destination = models.CharField(max_length=500)
    supporting_source = models.ForeignKey(Source, on_delete=models.PROTECT, related_name="application_routes")
    last_checked_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=RouteStatus.choices, default=RouteStatus.NEEDS_REVIEW, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("route_type",)
        indexes = [models.Index(fields=("vacancy", "status"), name="fursa_route_vac_status_idx")]

    def clean(self):
        super().clean()
        parsed = urlsplit((self.destination or "").strip())
        allowed = False
        if self.route_type == self.RouteType.WEBSITE:
            allowed = parsed.scheme == "https" and bool(parsed.hostname)
        elif self.route_type == self.RouteType.EMAIL:
            allowed = parsed.scheme == "mailto" and bool(parsed.path) and not any(c.isspace() for c in self.destination)
        elif self.route_type == self.RouteType.WHATSAPP:
            allowed = parsed.scheme == "https" and parsed.hostname in {"wa.me", "api.whatsapp.com"}
        if self.destination and not allowed:
            raise ValidationError({"destination": "Use HTTPS for websites, mailto: for email, or an approved HTTPS WhatsApp link."})

    def __str__(self):
        return f"{self.get_route_type_display()} for {self.vacancy}"

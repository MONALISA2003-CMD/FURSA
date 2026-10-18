"""Focused Phase 3 regression tests for public listing integrity and API contracts."""
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from .models import ApplicationRoute, Category, Country, Region, Source, Vacancy


class PublicCatalogueIntegrityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.uae = Country.objects.get(code="AE")
        cls.saudi = Country.objects.get(code="SA")
        cls.category = Category.objects.get(slug="it-software")
        cls.dubai = Region.objects.get(code="ae-dubai")
        cls.riyadh = Region.objects.get(code="sa-riyadh")
        cls.source = Source.objects.create(
            name="Test employer careers page",
            source_url="https://careers.example.com",
            source_type=Source.SourceType.EMPLOYER_CAREERS,
            permission_note="Private test fixture only.",
            original_text="Private test source text.",
            source_last_checked_at=timezone.now(),
        )

    def create_vacancy(
        self,
        *,
        country=None,
        region=None,
        category=None,
        title="Software Engineer",
        route_source=None,
        route_checked=True,
    ):
        now = timezone.now()
        vacancy = Vacancy.objects.create(
            title_original=title,
            title_en=title,
            title_ar="مهندس برمجيات",
            employer_name="Test Employer",
            description_original="Source-backed test description.",
            description_en="Build and maintain software applications.",
            description_ar="بناء تطبيقات البرمجيات وصيانتها.",
            country=country or self.uae,
            region=region,
            category=self.category if category is None else category,
            status=Vacancy.Status.PUBLISHED,
            published_at=now,
            last_checked_at=now,
            deadline_at=now + timedelta(days=10),
            expires_at=now + timedelta(days=10),
        )
        vacancy.sources.add(self.source)
        ApplicationRoute.objects.create(
            vacancy=vacancy,
            route_type=ApplicationRoute.RouteType.WEBSITE,
            destination="https://careers.example.com/jobs/123",
            supporting_source=route_source or self.source,
            last_checked_at=now if route_checked else None,
            status=ApplicationRoute.RouteStatus.OK,
        )
        return vacancy

    def test_public_list_and_detail_fail_closed_for_cross_country_region(self):
        bad = self.create_vacancy(country=self.uae, region=self.riyadh, title="Mismatched region")
        good = self.create_vacancy(country=self.uae, region=self.dubai, title="Dubai role")

        listing = self.client.get("/api/v1/jobs/", {"country": "AE"})
        self.assertEqual(listing.status_code, 200)
        ids = {row["id"] for row in listing.json()["results"]}
        self.assertIn(str(good.id), ids)
        self.assertNotIn(str(bad.id), ids)

        detail = self.client.get(f"/api/v1/jobs/{bad.id}/")
        self.assertEqual(detail.status_code, 404)

    def test_model_validation_rejects_a_region_from_another_country(self):
        invalid = Vacancy(
            title_original="Invalid region relationship",
            country=self.uae,
            region=self.riyadh,
        )
        with self.assertRaises(ValidationError) as error:
            invalid.full_clean()
        self.assertIn("region", error.exception.message_dict)

    def test_public_region_filter_cannot_cross_country(self):
        self.create_vacancy(country=self.uae, region=self.dubai)
        self.create_vacancy(country=self.saudi, region=self.riyadh)

        wrong_country = self.client.get("/api/v1/jobs/", {"country": "SA", "region": "ae-dubai"})
        self.assertEqual(wrong_country.status_code, 200)
        self.assertEqual(wrong_country.json()["count"], 0)

        correct_country = self.client.get("/api/v1/jobs/", {"country": "AE", "region": "ae-dubai"})
        self.assertEqual(correct_country.status_code, 200)
        self.assertEqual(correct_country.json()["count"], 1)

    def test_public_query_requires_checked_route_and_attached_supporting_source(self):
        other_source = Source.objects.create(
            name="Unattached source", source_url="https://other.example.com", source_type=Source.SourceType.OTHER_PUBLIC
        )
        unchecked = self.create_vacancy(title="Unchecked route", route_checked=False)
        unattached = self.create_vacancy(title="Unattached route source", route_source=other_source)
        valid = self.create_vacancy(title="Valid route")

        listing = self.client.get("/api/v1/jobs/")
        self.assertEqual(listing.status_code, 200)
        ids = {row["id"] for row in listing.json()["results"]}
        self.assertIn(str(valid.id), ids)
        self.assertNotIn(str(unchecked.id), ids)
        self.assertNotIn(str(unattached.id), ids)

    def test_disabled_country_or_inactive_category_hides_its_public_jobs(self):
        country_job = self.create_vacancy(country=self.saudi, region=self.riyadh, title="Saudi role")
        category_job = self.create_vacancy(title="Inactive category role")
        self.saudi.enabled = False
        self.saudi.save(update_fields=["enabled"])
        self.category.active = False
        self.category.save(update_fields=["active"])

        listing = self.client.get("/api/v1/jobs/")
        self.assertEqual(listing.status_code, 200)
        ids = {row["id"] for row in listing.json()["results"]}
        self.assertNotIn(str(country_job.id), ids)
        self.assertNotIn(str(category_job.id), ids)


class PublicSearchContractTests(TestCase):
    def test_search_query_has_a_documented_length_limit(self):
        response = self.client.get("/api/v1/jobs/", {"q": "x" * 161})
        self.assertEqual(response.status_code, 400)
        self.assertIn("q", response.json())

    def test_unsupported_filter_enums_are_rejected_instead_of_silently_ignored(self):
        for params in (
            {"work_mode": "TELEPORT"},
            {"employment_type": "PERMANENT_FOREVER"},
            {"sort": "random"},
        ):
            with self.subTest(params=params):
                response = self.client.get("/api/v1/jobs/", params)
                self.assertEqual(response.status_code, 400)

    def test_supported_sort_modes_remain_available(self):
        for mode in ("newest", "checked"):
            with self.subTest(sort=mode):
                response = self.client.get("/api/v1/jobs/", {"sort": mode})
                self.assertEqual(response.status_code, 200)

from datetime import timedelta
from unittest.mock import patch

from django.db.utils import DatabaseError
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import ApplicationRoute, Category, Country, Source, Vacancy


class HealthEndpointTests(TestCase):
    def test_health_endpoint_reports_database_connection(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        self.assertEqual(response.json()["service"], "fursa-api")
        self.assertEqual(response.json()["database"], "connected")

    @patch("core.views.connection.cursor")
    def test_health_endpoint_reports_database_unavailable(self, mock_cursor):
        mock_cursor.side_effect = DatabaseError("private database details")
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["database"], "unavailable")
        self.assertNotIn("private database details", response.content.decode())

    def test_api_root_is_informative(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "fursa-api")
        self.assertEqual(response.json()["health"], "/api/v1/health/")

    def test_api_root_accepts_head_for_platform_probes(self):
        response = self.client.head("/")
        self.assertEqual(response.status_code, 200)

    @override_settings(CORS_ALLOWED_ORIGINS=["https://fursa-web-a2ot.onrender.com"])
    def test_cors_allows_only_the_configured_website(self):
        allowed = self.client.options(
            "/api/v1/jobs/",
            HTTP_ORIGIN="https://fursa-web-a2ot.onrender.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )
        self.assertEqual(allowed.status_code, 204)
        self.assertEqual(allowed["Access-Control-Allow-Origin"], "https://fursa-web-a2ot.onrender.com")

        blocked = self.client.get("/api/v1/jobs/", HTTP_ORIGIN="https://attacker.example")
        self.assertNotIn("Access-Control-Allow-Origin", blocked)


class PublicJobCatalogueTests(TestCase):
    def setUp(self):
        self.country = Country.objects.get(code="AE")
        self.category = Category.objects.get(slug="it-software")
        self.source = Source.objects.create(
            name="Example employer careers page",
            source_url="https://careers.example.com",
            permission_note="Private reviewer note: source permitted for a test fixture.",
            original_text="Private source text should not leave the API.",
            source_last_checked_at=timezone.now(),
        )

    def create_vacancy(
        self,
        *,
        title="Software Engineer",
        status=Vacancy.Status.PUBLISHED,
        expires_at=None,
        destination="https://careers.example.com/jobs/software-engineer",
        route_status=ApplicationRoute.RouteStatus.OK,
        with_source=True,
        description_en="Build and maintain software applications.",
    ):
        now = timezone.now()
        vacancy = Vacancy.objects.create(
            title_original=title,
            title_en=title,
            title_ar="مهندس برمجيات",
            employer_name="Example Employer",
            description_original="Original source-backed test description.",
            description_en=description_en,
            description_ar="بناء تطبيقات البرمجيات وصيانتها.",
            country=self.country,
            category=self.category,
            status=status,
            published_at=now if status == Vacancy.Status.PUBLISHED else None,
            last_checked_at=now,
            expires_at=expires_at,
        )
        if with_source:
            vacancy.sources.add(self.source)
        ApplicationRoute.objects.create(
            vacancy=vacancy,
            route_type=ApplicationRoute.RouteType.WEBSITE,
            destination=destination,
            supporting_source=self.source,
            last_checked_at=now,
            status=route_status,
        )
        return vacancy

    def test_job_list_returns_only_published_source_backed_jobs_with_safe_routes(self):
        public_job = self.create_vacancy()
        self.create_vacancy(title="Unpublished Draft", status=Vacancy.Status.DRAFT)
        self.create_vacancy(title="Unreviewed Route", route_status=ApplicationRoute.RouteStatus.NEEDS_REVIEW)
        self.create_vacancy(title="Unsafe Route", destination="javascript:alert(1)")
        self.create_vacancy(title="Missing Source", with_source=False)

        response = self.client.get("/api/v1/jobs/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["results"][0]["id"], str(public_job.id))
        self.assertEqual(body["results"][0]["title_en"], "Software Engineer")
        self.assertNotIn("permission_note", str(body))
        self.assertNotIn("original_text", str(body))
        self.assertNotIn("submitter", str(body))

    def test_search_filters_by_text_and_country(self):
        matching = self.create_vacancy(title="Senior Software Engineer")
        self.create_vacancy(
            title="Warehouse Supervisor",
            description_en="Manage warehouse operations and inventory.",
        )

        response = self.client.get("/api/v1/jobs/", {"q": "software", "country": "AE"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
        self.assertEqual(response.json()["results"][0]["id"], str(matching.id))

    def test_expired_jobs_are_not_public(self):
        self.create_vacancy(expires_at=timezone.now() - timedelta(days=1))
        response = self.client.get("/api/v1/jobs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 0)

    def test_detail_endpoint_only_returns_public_jobs(self):
        published = self.create_vacancy()
        draft = self.create_vacancy(title="Private Draft", status=Vacancy.Status.DRAFT)

        response = self.client.get(f"/api/v1/jobs/{published.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], str(published.id))
        self.assertEqual(len(response.json()["application_routes"]), 1)

        draft_response = self.client.get(f"/api/v1/jobs/{draft.id}/")
        self.assertEqual(draft_response.status_code, 404)

    def test_reference_endpoints_return_bilingual_countries_and_categories(self):
        countries = self.client.get("/api/v1/countries/")
        categories = self.client.get("/api/v1/categories/")
        regions = self.client.get("/api/v1/regions/?country=AE")
        self.assertEqual(countries.status_code, 200)
        self.assertEqual(len(countries.json()), 5)
        self.assertTrue(any(row["code"] == "AE" and row["name_ar"] for row in countries.json()))
        self.assertEqual(categories.status_code, 200)
        self.assertTrue(any(row["slug"] == "it-software" for row in categories.json()))
        self.assertEqual(regions.status_code, 200)
        self.assertEqual(regions.json(), [])

    def test_salary_constraint_rejects_minimum_greater_than_maximum(self):
        from django.db import IntegrityError, transaction

        with self.assertRaises(IntegrityError), transaction.atomic():
            Vacancy.objects.create(
                title_original="Bad salary range",
                country=self.country,
                salary_min="9000.00",
                salary_max="1000.00",
            )

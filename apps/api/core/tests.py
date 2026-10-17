from unittest.mock import patch

from django.db.utils import DatabaseError
from django.test import TestCase


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

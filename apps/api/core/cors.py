from django.http import HttpResponse
from django.utils.cache import patch_vary_headers
from django.conf import settings


class PublicApiCorsMiddleware:
    """Allow the configured public website to call the read-only API cross-origin.

    This deliberately does not enable credentials or permissive wildcard origins.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        allowed_origin = origin in getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        public_api_path = request.path.startswith("/api/v1/")

        if (
            request.method == "OPTIONS"
            and allowed_origin
            and public_api_path
            and request.headers.get("Access-Control-Request-Method", "").upper() in {"GET", "OPTIONS"}
        ):
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if allowed_origin and public_api_path:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Accept, Content-Type"
            response["Access-Control-Max-Age"] = "600"
            patch_vary_headers(response, ("Origin",))
        return response

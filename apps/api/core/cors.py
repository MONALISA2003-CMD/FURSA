from django.conf import settings
from django.http import HttpResponse
from django.utils.cache import patch_vary_headers


class PublicApiCorsMiddleware:
    """Allow only configured FURSA web origins, with credentials for volunteer APIs."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origin = request.headers.get("Origin", "")
        allowed_origin = origin in getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        api_path = request.path.startswith("/api/v1/")
        volunteer_path = request.path.startswith("/api/v1/volunteer/")
        allowed_methods = {"GET", "HEAD", "OPTIONS"}
        if volunteer_path:
            allowed_methods.add("POST")
        requested_method = request.headers.get("Access-Control-Request-Method", "").upper()

        if request.method == "OPTIONS" and allowed_origin and api_path and requested_method in allowed_methods:
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        if allowed_origin and api_path:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = ", ".join(sorted(allowed_methods if volunteer_path else {"GET", "HEAD", "OPTIONS"}))
            response["Access-Control-Allow-Headers"] = "Accept, Content-Type, X-CSRFToken"
            response["Access-Control-Max-Age"] = "600"
            if volunteer_path:
                response["Access-Control-Allow-Credentials"] = "true"
            patch_vary_headers(response, ("Origin",))
        return response

from urllib.parse import urlsplit

from rest_framework import serializers

from .models import ApplicationRoute, Category, Country, Region, Source, Vacancy


def is_safe_application_route(route):
    destination = (route.destination or "").strip()
    parsed = urlsplit(destination)
    if route.route_type == ApplicationRoute.RouteType.WEBSITE:
        return parsed.scheme == "https" and bool(parsed.hostname)
    if route.route_type == ApplicationRoute.RouteType.EMAIL:
        return parsed.scheme == "mailto" and bool(parsed.path) and not any(c.isspace() for c in destination)
    if route.route_type == ApplicationRoute.RouteType.WHATSAPP:
        return parsed.scheme == "https" and parsed.hostname in {"wa.me", "api.whatsapp.com"}
    return False


class CountryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("code", "name_en", "name_ar")


class RegionPublicSerializer(serializers.ModelSerializer):
    country_code = serializers.CharField(source="country_id", read_only=True)

    class Meta:
        model = Region
        fields = ("code", "name_en", "name_ar", "country_code")


class CategoryPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("slug", "name_en", "name_ar")


class SourcePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        # Do not expose original source text, permission notes, or contributor evidence.
        fields = ("name", "source_url", "source_last_checked_at")


class ApplicationRoutePublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationRoute
        fields = ("route_type", "destination", "last_checked_at")


class VacancyPublicSerializer(serializers.ModelSerializer):
    country = CountryPublicSerializer(read_only=True)
    region = RegionPublicSerializer(read_only=True)
    category = CategoryPublicSerializer(read_only=True)
    sources = serializers.SerializerMethodField()
    application_routes = serializers.SerializerMethodField()

    class Meta:
        model = Vacancy
        fields = (
            "id",
            "title_original",
            "title_en",
            "title_ar",
            "employer_name",
            "description_original",
            "description_en",
            "description_ar",
            "country",
            "region",
            "category",
            "employment_type",
            "work_mode",
            "salary_min",
            "salary_max",
            "salary_currency",
            "salary_period",
            "eligibility_text",
            "sponsorship_status",
            "original_posted_at",
            "published_at",
            "last_checked_at",
            "deadline_at",
            "sources",
            "application_routes",
        )

    def get_sources(self, obj):
        return SourcePublicSerializer(obj.sources.all(), many=True).data

    def get_application_routes(self, obj):
        routes = getattr(obj, "public_application_routes", None)
        if routes is None:
            routes = [
                route for route in obj.application_routes.filter(status=ApplicationRoute.RouteStatus.OK)
                if is_safe_application_route(route)
            ]
        return ApplicationRoutePublicSerializer(routes, many=True).data

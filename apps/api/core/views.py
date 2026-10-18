from django.db import connection
from django.db.models import Prefetch, Q
from django.db.utils import DatabaseError
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import ApplicationRoute, Category, Country, Region, Source, Vacancy
from .serializers import (
    CategoryPublicSerializer,
    CountryPublicSerializer,
    RegionPublicSerializer,
    VacancyPublicSerializer,
)


class VacancyPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 50


def safe_route_filter(prefix=""):
    field = lambda name: f"{prefix}{name}"
    return (
        Q(**{field("route_type"): ApplicationRoute.RouteType.WEBSITE}, **{f"{field('destination')}__regex": r"^https://[^/?#]+(?:[/?#]|$)"})
        | Q(**{field("route_type"): ApplicationRoute.RouteType.EMAIL}, **{f"{field('destination')}__regex": r"^mailto:[^@\s]+@[^@\s]+$"})
        | Q(**{field("route_type"): ApplicationRoute.RouteType.WHATSAPP}, **{f"{field('destination')}__regex": r"^https://(wa\.me|api\.whatsapp\.com)(/|$)"})
    )


def public_vacancies_queryset():
    now = timezone.now()
    public_routes = ApplicationRoute.objects.filter(status=ApplicationRoute.RouteStatus.OK).filter(safe_route_filter())
    return (
        Vacancy.objects.filter(
            status=Vacancy.Status.PUBLISHED,
            published_at__isnull=False,
            last_checked_at__isnull=False,
        )
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        .filter(Q(deadline_at__isnull=True) | Q(deadline_at__gte=now))
        .filter(sources__isnull=False)
        .filter(application_routes__in=public_routes)
        .select_related("country", "region", "category")
        .prefetch_related(
            "sources",
            Prefetch(
                "application_routes",
                queryset=public_routes,
                to_attr="public_application_routes",
            ),
        )
        .distinct()
    )


@api_view(["GET", "HEAD"])
@permission_classes([AllowAny])
def root(request):
    """Provide a lightweight liveness response for the Render health check."""
    return Response({
        "service": "fursa-api",
        "status": "ok",
        "health": "/api/v1/health/",
        "api_prefix": "/api/v1/",
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Readiness probe: verify Django can query its configured database."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response(
            {"status": "error", "service": "fursa-api", "database": "unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({
        "status": "ok",
        "service": "fursa-api",
        "version": "1",
        "database": "connected",
    })


class PublicVacancyListView(generics.ListAPIView):
    serializer_class = VacancyPublicSerializer
    permission_classes = [AllowAny]
    pagination_class = VacancyPagination

    def get_queryset(self):
        qs = public_vacancies_queryset()
        params = self.request.query_params
        term = (params.get("q") or "").strip()
        if term:
            if connection.vendor == "postgresql":
                from django.contrib.postgres.search import SearchQuery, SearchVector

                vector = SearchVector(
                    "title_original", "title_en", "title_ar", "employer_name",
                    "description_original", "description_en", "description_ar",
                    config="simple",
                )
                qs = qs.annotate(search_document=vector).filter(
                    search_document=SearchQuery(term, config="simple")
                )
            else:
                qs = qs.filter(
                    Q(title_original__icontains=term)
                    | Q(title_en__icontains=term)
                    | Q(title_ar__icontains=term)
                    | Q(employer_name__icontains=term)
                    | Q(description_original__icontains=term)
                    | Q(description_en__icontains=term)
                    | Q(description_ar__icontains=term)
                )
        country = (params.get("country") or "").strip().upper()
        if country:
            qs = qs.filter(country_id=country)
        region = (params.get("region") or "").strip()
        if region:
            qs = qs.filter(region__code__iexact=region)
        category = (params.get("category") or "").strip()
        if category:
            qs = qs.filter(category__slug=category)
        work_mode = (params.get("work_mode") or "").strip().upper()
        if work_mode in Vacancy.WorkMode.values:
            qs = qs.filter(work_mode=work_mode)
        employment_type = (params.get("employment_type") or "").strip().upper()
        if employment_type in Vacancy.EmploymentType.values:
            qs = qs.filter(employment_type=employment_type)

        sort = (params.get("sort") or "newest").strip().lower()
        if sort == "checked":
            qs = qs.order_by("-last_checked_at", "-published_at")
        else:
            qs = qs.order_by("-published_at", "-received_at")
        return qs


class PublicVacancyDetailView(generics.RetrieveAPIView):
    serializer_class = VacancyPublicSerializer
    permission_classes = [AllowAny]
    lookup_field = "pk"

    def get_queryset(self):
        # Evaluate expiry/deadline cutoffs for each request, not only at process startup.
        return public_vacancies_queryset()


class CountryListView(generics.ListAPIView):
    serializer_class = CountryPublicSerializer
    permission_classes = [AllowAny]
    queryset = Country.objects.filter(enabled=True).order_by("sort_order", "name_en")


class RegionListView(generics.ListAPIView):
    serializer_class = RegionPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Region.objects.filter(enabled=True, country__enabled=True).select_related("country")
        country = (self.request.query_params.get("country") or "").strip().upper()
        if country:
            qs = qs.filter(country_id=country)
        return qs


class CategoryListView(generics.ListAPIView):
    serializer_class = CategoryPublicSerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.filter(active=True).order_by("name_en")

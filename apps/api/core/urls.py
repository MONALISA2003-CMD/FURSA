from django.urls import path

from .views import (
    CategoryListView,
    CountryListView,
    PublicVacancyDetailView,
    PublicVacancyListView,
    RegionListView,
    health,
)

urlpatterns = [
    path("health/", health, name="api-health"),
    path("jobs/", PublicVacancyListView.as_view(), name="public-job-list"),
    path("jobs/<uuid:pk>/", PublicVacancyDetailView.as_view(), name="public-job-detail"),
    path("countries/", CountryListView.as_view(), name="public-country-list"),
    path("regions/", RegionListView.as_view(), name="public-region-list"),
    path("categories/", CategoryListView.as_view(), name="public-category-list"),
]

from django.contrib import admin
from django.urls import include, path
from core.views import root

urlpatterns = [
    path("", root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("core.urls")),
    path("api/v1/volunteer/", include("volunteers.urls")),
    path("api/v1/moderation/", include("moderation.urls")),
]

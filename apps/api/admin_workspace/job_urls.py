from django.urls import path
from .views import JobCollectionView, JobDetailView, JobStatusView

urlpatterns = [
    path("", JobCollectionView.as_view(), name="admin-job-list-create"),
    path("<uuid:pk>/", JobDetailView.as_view(), name="admin-job-detail"),
    path("<uuid:pk>/status/", JobStatusView.as_view(), name="admin-job-status"),
]

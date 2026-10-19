from django.urls import path
from .views import (
    ReviewDecisionView, ReviewQueueView, SafetyReportDecisionView,
    SafetyReportListCreateView, SubmissionDetailView, SubmissionListCreateView,
    SubmissionSubmitView,
)

urlpatterns = [
    path("submissions/", SubmissionListCreateView.as_view(), name="moderation-submissions"),
    path("submissions/<uuid:pk>/", SubmissionDetailView.as_view(), name="moderation-submission-detail"),
    path("submissions/<uuid:pk>/submit/", SubmissionSubmitView.as_view(), name="moderation-submission-submit"),
    path("review-queue/", ReviewQueueView.as_view(), name="moderation-review-queue"),
    path("review-queue/<uuid:pk>/decision/", ReviewDecisionView.as_view(), name="moderation-review-decision"),
    path("reports/", SafetyReportListCreateView.as_view(), name="moderation-reports"),
    path("reports/<int:pk>/decision/", SafetyReportDecisionView.as_view(), name="moderation-report-decision"),
]

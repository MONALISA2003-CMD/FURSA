from django.urls import path
from .views import (
    FounderAwareDashboardView, FounderInvitationListCreateView,
    FounderInvitationRevokeView, FounderTeamView, FounderTeamMemberUpdateView, FounderPasswordResetLinkView, PasswordResetRequestInfoView,
)

urlpatterns = [
    path("dashboard/", FounderAwareDashboardView.as_view(), name="founder-aware-volunteer-dashboard"),
    path("auth/password-reset/request/", PasswordResetRequestInfoView.as_view(), name="manual-password-reset-request-info"),
    path("invitations/", FounderInvitationListCreateView.as_view(), name="founder-only-invitations"),
    path("invitations/<int:pk>/revoke/", FounderInvitationRevokeView.as_view(), name="founder-only-invitation-revoke"),
    path("team/", FounderTeamView.as_view(), name="founder-only-team"),
    path("team/<int:pk>/update/", FounderTeamMemberUpdateView.as_view(), name="founder-only-team-update"),
    path("team/<int:pk>/password-reset-link/", FounderPasswordResetLinkView.as_view(), name="founder-admin-password-reset-link"),
]

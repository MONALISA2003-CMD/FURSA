from django.urls import path

from .views import (
    AcceptInvitationView,
    GoogleLoginView,
    InvitationListCreateView,
    InvitationRevokeView,
    PasswordLoginView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    VolunteerDashboardView,
    VolunteerLogoutView,
    VolunteerTeamMemberUpdateView,
    VolunteerTeamView,
    VolunteerMeView,
    csrf_bootstrap,
)

urlpatterns = [
    path("csrf/", csrf_bootstrap, name="volunteer-csrf"),
    path("auth/login/", PasswordLoginView.as_view(), name="volunteer-login"),
    path("auth/google/", GoogleLoginView.as_view(), name="volunteer-google-login"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="volunteer-password-reset-request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="volunteer-password-reset-confirm"),
    path("auth/accept-invitation/", AcceptInvitationView.as_view(), name="volunteer-accept-invitation"),
    path("auth/logout/", VolunteerLogoutView.as_view(), name="volunteer-logout"),
    path("me/", VolunteerMeView.as_view(), name="volunteer-me"),
    path("dashboard/", VolunteerDashboardView.as_view(), name="volunteer-dashboard"),
    path("invitations/", InvitationListCreateView.as_view(), name="volunteer-invitations"),
    path("invitations/<int:pk>/revoke/", InvitationRevokeView.as_view(), name="volunteer-invitation-revoke"),
    path("team/", VolunteerTeamView.as_view(), name="volunteer-team"),
    path("team/<int:pk>/update/", VolunteerTeamMemberUpdateView.as_view(), name="volunteer-team-member-update"),
]

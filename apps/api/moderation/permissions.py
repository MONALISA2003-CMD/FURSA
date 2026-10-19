from rest_framework.permissions import BasePermission
from volunteers.models import VolunteerProfile


class ActiveVolunteer(BasePermission):
    message = "An active FURSA volunteer account is required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        try:
            return user.volunteer_profile.status == VolunteerProfile.Status.ACTIVE
        except VolunteerProfile.DoesNotExist:
            return False


class ReviewerOrAdmin(ActiveVolunteer):
    message = "Only reviewers and administrators can perform this action."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.volunteer_profile.role in {VolunteerProfile.Role.REVIEWER, VolunteerProfile.Role.ADMIN}

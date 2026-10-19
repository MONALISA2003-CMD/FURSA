from rest_framework.permissions import BasePermission
from volunteers.models import VolunteerProfile


class ActiveVolunteer(BasePermission):
    message = "An active FURSA admin account is required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        try:
            return user.volunteer_profile.status == VolunteerProfile.Status.ACTIVE
        except VolunteerProfile.DoesNotExist:
            return False


class ReviewerOrAdmin(ActiveVolunteer):
    """Legacy review endpoints remain available to all active FURSA admins."""
    message = "An active FURSA admin account is required."

    def has_permission(self, request, view):
        return super().has_permission(request, view)

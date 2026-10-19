from rest_framework.permissions import BasePermission

from .models import VolunteerProfile


class ActiveVolunteerPermission(BasePermission):
    message = "An active FURSA volunteer account is required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated or not request.user.is_active:
            return False
        try:
            profile = request.user.volunteer_profile
        except VolunteerProfile.DoesNotExist:
            return False
        return profile.status == VolunteerProfile.Status.ACTIVE


class VolunteerAdminPermission(ActiveVolunteerPermission):
    message = "Only an active FURSA administrator can manage volunteer invitations."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.volunteer_profile.role == VolunteerProfile.Role.ADMIN

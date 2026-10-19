import os

from rest_framework.permissions import BasePermission

from volunteers.models import VolunteerProfile


def is_fursa_founder(user):
    """Founder privileges fail closed unless the server explicitly configures the founder email."""
    configured = os.environ.get("FURSA_FOUNDER_EMAIL", "").strip().casefold()
    if not configured or not user or not user.is_authenticated or not user.is_active:
        return False
    try:
        profile = user.volunteer_profile
    except VolunteerProfile.DoesNotExist:
        return False
    return profile.status == VolunteerProfile.Status.ACTIVE and user.email.strip().casefold() == configured


class ActiveFursaAdmin(BasePermission):
    message = "An active FURSA admin account is required."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False
        try:
            profile = user.volunteer_profile
        except VolunteerProfile.DoesNotExist:
            return False
        # Existing legacy role values are intentionally treated as one admin type.
        return profile.status == VolunteerProfile.Status.ACTIVE


class FounderOnly(BasePermission):
    message = "Only the FURSA founder can invite or deactivate admins."

    def has_permission(self, request, view):
        return is_fursa_founder(request.user)

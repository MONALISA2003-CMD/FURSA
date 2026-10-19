import hashlib
import os

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from django.middleware.csrf import get_token

from .models import AuditEvent, VolunteerInvitation, VolunteerProfile
from .permissions import ActiveVolunteerPermission, VolunteerAdminPermission

User = get_user_model()


def _username_for_email(email):
    if len(email) <= 150:
        return email
    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()[:24]
    return f"{email[:120]}_{digest}"


def _profile_payload(user):
    profile = user.volunteer_profile
    return {
        "id": profile.pk,
        "name": user.get_full_name() or user.get_username(),
        "email": user.email,
        "role": profile.role,
        "status": profile.status,
    }


def _audit(actor, action, object_type, object_id="", details=None):
    return AuditEvent.objects.create(
        actor=actor,
        action=action,
        object_type=object_type,
        object_id=str(object_id or ""),
        details=details or {},
    )


def _pending_invitation(email):
    return VolunteerInvitation.objects.select_for_update().filter(
        email__iexact=email,
        accepted_at__isnull=True,
        revoked_at__isnull=True,
        expires_at__gt=timezone.now(),
    ).order_by("-created_at").first()


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_bootstrap(request):
    """Return a CSRF token for credentialed cross-origin session requests."""
    return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class PasswordLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        raw_email = request.data.get("email")
        password = request.data.get("password")
        email = raw_email.strip().casefold() if isinstance(raw_email, str) else ""
        if not email or not isinstance(password, str) or not password:
            return Response({"detail": "Enter your email address and password."}, status=status.HTTP_400_BAD_REQUEST)

        candidate = User.objects.filter(email__iexact=email).first() if email else None
        user = authenticate(request, username=candidate.get_username() if candidate else email, password=password)
        if not user or not user.is_active:
            return Response({"detail": "Email or password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            profile = user.volunteer_profile
        except VolunteerProfile.DoesNotExist:
            return Response({"detail": "This account does not have volunteer access."}, status=status.HTTP_403_FORBIDDEN)
        if profile.status != VolunteerProfile.Status.ACTIVE:
            return Response({"detail": "This volunteer account is not active. Contact a FURSA administrator."}, status=status.HTTP_403_FORBIDDEN)

        login(request._request, user)
        remember_me = request.data.get("remember_me") in (True, 1, "1", "true", "True")
        request._request.session.set_expiry(None if remember_me else 0)
        _audit(user, "volunteer.login.password", "VolunteerProfile", profile.pk)
        return Response({"user": _profile_payload(user)})


@method_decorator(csrf_protect, name="dispatch")
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
        credential = request.data.get("credential")
        if not client_id:
            return Response({"detail": "Google sign-in is not configured yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if not isinstance(credential, str) or not credential or len(credential) > 10000:
            return Response({"detail": "Google did not return a valid credential."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token
            claims = id_token.verify_oauth2_token(credential, google_requests.Request(), audience=client_id)
        except Exception:
            return Response({"detail": "Google sign-in could not be verified. Please try again."}, status=status.HTTP_401_UNAUTHORIZED)

        email = str(claims.get("email", "")).strip().casefold()
        if not email or claims.get("email_verified") is not True:
            return Response({"detail": "Use a Google account with a verified email address."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            if user:
                if not user.is_active:
                    return Response({"detail": "This account is not active."}, status=status.HTTP_403_FORBIDDEN)
                try:
                    profile = user.volunteer_profile
                except VolunteerProfile.DoesNotExist:
                    profile = None
                if profile is None:
                    invitation = _pending_invitation(email)
                    if invitation is None:
                        return Response({"detail": "This Google account has not been invited to FURSA."}, status=status.HTTP_403_FORBIDDEN)
                    profile = VolunteerProfile.objects.create(user=user, role=invitation.role)
                    invitation.accepted_at = timezone.now()
                    invitation.accepted_by = user
                    invitation.save(update_fields=["accepted_at", "accepted_by"])
                    _audit(user, "volunteer.invitation.accepted_google", "VolunteerInvitation", invitation.pk, {"role": invitation.role})
            else:
                invitation = _pending_invitation(email)
                if invitation is None:
                    return Response({"detail": "This Google account has not been invited to FURSA."}, status=status.HTTP_403_FORBIDDEN)
                display_name = str(claims.get("name", "")).strip()
                names = display_name.split(" ", 1)
                user = User.objects.create_user(
                    username=_username_for_email(email),
                    email=email,
                    password=None,
                    first_name=names[0][:150] if names else "",
                    last_name=names[1][:150] if len(names) > 1 else "",
                )
                profile = VolunteerProfile.objects.create(user=user, role=invitation.role)
                invitation.accepted_at = timezone.now()
                invitation.accepted_by = user
                invitation.save(update_fields=["accepted_at", "accepted_by"])
                _audit(user, "volunteer.invitation.accepted_google", "VolunteerInvitation", invitation.pk, {"role": invitation.role})

            if not user.is_active or profile.status != VolunteerProfile.Status.ACTIVE:
                return Response({"detail": "This volunteer account is not active."}, status=status.HTTP_403_FORBIDDEN)
            login(request._request, user, backend="django.contrib.auth.backends.ModelBackend")
            request._request.session.set_expiry(0)
            _audit(user, "volunteer.login.google", "VolunteerProfile", profile.pk)
        return Response({"user": _profile_payload(user)})


@method_decorator(csrf_protect, name="dispatch")
class AcceptInvitationView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        raw_token = request.data.get("token")
        raw_email = request.data.get("email")
        password = request.data.get("password")
        raw_first_name = request.data.get("first_name", "")
        raw_last_name = request.data.get("last_name", "")
        email = raw_email.strip().casefold() if isinstance(raw_email, str) else ""
        raw_token = raw_token if isinstance(raw_token, str) else ""
        first_name = raw_first_name.strip()[:150] if isinstance(raw_first_name, str) else ""
        last_name = raw_last_name.strip()[:150] if isinstance(raw_last_name, str) else ""
        if not raw_token or not email or not isinstance(password, str) or not password:
            return Response({"detail": "Invitation token, email, and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        invitation = VolunteerInvitation.objects.select_for_update().filter(token_hash=VolunteerInvitation.hash_token(raw_token), email__iexact=email).first()
        if not invitation or not invitation.is_pending:
            return Response({"detail": "This invitation is invalid, expired, or already used."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
            return Response({"detail": "An account already exists for this email. Please sign in or contact an administrator."}, status=status.HTTP_409_CONFLICT)
        try:
            validate_password(password, user=User(username=email, email=email, first_name=first_name, last_name=last_name))
        except DjangoValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user = User.objects.create_user(username=_username_for_email(email), email=email, password=password, first_name=first_name, last_name=last_name)
            profile = VolunteerProfile.objects.create(user=user, role=invitation.role)
            invitation.accepted_at = timezone.now()
            invitation.accepted_by = user
            invitation.save(update_fields=["accepted_at", "accepted_by"])
            _audit(user, "volunteer.invitation.accepted_password", "VolunteerInvitation", invitation.pk, {"role": invitation.role})
            login(request._request, user, backend="django.contrib.auth.backends.ModelBackend")
            request._request.session.set_expiry(0)
            _audit(user, "volunteer.login.invitation", "VolunteerProfile", profile.pk)
        return Response({"user": _profile_payload(user)}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.DEBUG:
            return Response({"detail": "Password-recovery email is not configured yet. Contact a FURSA administrator."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        raw_email = request.data.get("email")
        email = raw_email.strip().casefold() if isinstance(raw_email, str) else ""
        locale = request.data.get("locale", "en")
        if not isinstance(locale, str) or locale not in {"en", "ar"}:
            locale = "en"
        payload = {"detail": "If an active volunteer account matches that email, a development reset link is available."}
        user = User.objects.filter(email__iexact=email, is_active=True).first() if email else None
        if user:
            try:
                profile = user.volunteer_profile
            except VolunteerProfile.DoesNotExist:
                profile = None
            if profile and profile.status == VolunteerProfile.Status.ACTIVE:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                payload["reset_url"] = f"/{locale}/volunteer/reset-password?uid={uid}&token={token}"
        return Response(payload)


@method_decorator(csrf_protect, name="dispatch")
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")
        if not isinstance(uid, str) or not isinstance(token, str) or not isinstance(password, str) or not uid or not token or not password:
            return Response({"detail": "Reset link and a new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.select_for_update().get(pk=user_id, is_active=True)
            profile = user.volunteer_profile
        except (ValueError, TypeError, OverflowError, UnicodeDecodeError, User.DoesNotExist, VolunteerProfile.DoesNotExist):
            return Response({"detail": "This password-reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        if profile.status != VolunteerProfile.Status.ACTIVE or not default_token_generator.check_token(user, token):
            return Response({"detail": "This password-reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response({"password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(password)
        user.save(update_fields=["password"])
        _audit(user, "volunteer.password.reset", "VolunteerProfile", profile.pk)
        return Response({"detail": "Password updated. You can now sign in."})


class VolunteerMeView(APIView):
    permission_classes = [ActiveVolunteerPermission]

    def get(self, request):
        return Response({"user": _profile_payload(request.user)})


class VolunteerDashboardView(APIView):
    permission_classes = [ActiveVolunteerPermission]

    def get(self, request):
        profile = request.user.volunteer_profile
        capabilities = {
            "can_submit_vacancies": profile.role in {VolunteerProfile.Role.CONTRIBUTOR, VolunteerProfile.Role.REVIEWER, VolunteerProfile.Role.ADMIN},
            "can_review_vacancies": profile.role in {VolunteerProfile.Role.REVIEWER, VolunteerProfile.Role.ADMIN},
            "can_manage_team": profile.role == VolunteerProfile.Role.ADMIN,
        }
        return Response({"user": _profile_payload(request.user), "capabilities": capabilities, "phase": "4A-foundation"})


@method_decorator(csrf_protect, name="dispatch")
class VolunteerLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile_id = request.user.volunteer_profile.pk
        except VolunteerProfile.DoesNotExist:
            profile_id = ""
        _audit(request.user, "volunteer.logout", "VolunteerProfile", profile_id)
        logout(request._request)
        return Response({"status": "signed_out"})


@method_decorator(csrf_protect, name="dispatch")
class InvitationListCreateView(APIView):
    permission_classes = [VolunteerAdminPermission]

    def get(self, request):
        rows = VolunteerInvitation.objects.all()[:100]
        return Response({"results": [{
            "id": item.pk,
            "email": item.email,
            "role": item.role,
            "created_at": item.created_at,
            "expires_at": item.expires_at,
            "accepted_at": item.accepted_at,
            "revoked_at": item.revoked_at,
            "status": "accepted" if item.accepted_at else "revoked" if item.revoked_at else "expired" if item.expires_at <= timezone.now() else "pending",
        } for item in rows]})

    @transaction.atomic
    def post(self, request):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        if not settings.DEBUG:
            return Response({"detail": "Production invitation email delivery is not configured. No invitation was created."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        raw_email = request.data.get("email")
        raw_role = request.data.get("role", VolunteerProfile.Role.CONTRIBUTOR)
        email = raw_email.strip().casefold() if isinstance(raw_email, str) else ""
        role = raw_role.strip().upper() if isinstance(raw_role, str) else ""
        if not email:
            return Response({"email": "Enter an email address."}, status=status.HTTP_400_BAD_REQUEST)
        if len(email) > 254:
            return Response({"email": "Email addresses must be 254 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_email(email)
        except DjangoValidationError:
            return Response({"email": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)
        if role not in VolunteerProfile.Role.values:
            return Response({"role": "Choose a valid volunteer role."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": "An account already exists for this email. Manage its existing volunteer access instead."}, status=status.HTTP_409_CONFLICT)
        now = timezone.now()
        older_pending = VolunteerInvitation.objects.select_for_update().filter(
            email__iexact=email, accepted_at__isnull=True, revoked_at__isnull=True, expires_at__gt=now
        )
        for older in older_pending:
            older.revoked_at = now
            older.save(update_fields=["revoked_at"])
            _audit(request.user, "volunteer.invitation.superseded", "VolunteerInvitation", older.pk, {"email": email})
        invitation, raw_token = VolunteerInvitation.issue(email=email, role=role, invited_by=request.user)
        _audit(request.user, "volunteer.invitation.created", "VolunteerInvitation", invitation.pk, {"email": email, "role": role})
        payload = {"id": invitation.pk, "email": invitation.email, "role": invitation.role, "expires_at": invitation.expires_at, "delivery": "development_only"}
        if settings.DEBUG:
            locale = request.data.get("locale", "en")
            if not isinstance(locale, str) or locale not in {"en", "ar"}:
                locale = "en"
            payload["invitation_url"] = f"/{locale}/volunteer/sign-in?invitation={raw_token}"
        return Response(payload, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class InvitationRevokeView(APIView):
    permission_classes = [VolunteerAdminPermission]

    @transaction.atomic
    def post(self, request, pk):
        invitation = VolunteerInvitation.objects.select_for_update().filter(pk=pk).first()
        if invitation is None:
            return Response({"detail": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)
        if not invitation.is_pending:
            return Response({"detail": "Only a pending invitation can be revoked."}, status=status.HTTP_409_CONFLICT)
        invitation.revoked_at = timezone.now()
        invitation.save(update_fields=["revoked_at"])
        _audit(request.user, "volunteer.invitation.revoked", "VolunteerInvitation", invitation.pk, {"email": invitation.email})
        return Response({"id": invitation.pk, "status": "revoked"})


class VolunteerTeamView(APIView):
    permission_classes = [VolunteerAdminPermission]

    def get(self, request):
        profiles = VolunteerProfile.objects.select_related("user").order_by("user__email")[:200]
        return Response({"results": [{
            "id": profile.pk,
            "name": profile.user.get_full_name() or profile.user.get_username(),
            "email": profile.user.email,
            "role": profile.role,
            "status": profile.status,
            "created_at": profile.created_at,
        } for profile in profiles]})


@method_decorator(csrf_protect, name="dispatch")
class VolunteerTeamMemberUpdateView(APIView):
    permission_classes = [VolunteerAdminPermission]

    @transaction.atomic
    def post(self, request, pk):
        if not isinstance(request.data, dict):
            return Response({"detail": "Expected a JSON object."}, status=status.HTTP_400_BAD_REQUEST)
        # Lock the active admin set in a stable order so concurrent role changes
        # cannot accidentally remove every active administrator.
        active_admin_ids = list(VolunteerProfile.objects.select_for_update().filter(
            role=VolunteerProfile.Role.ADMIN,
            status=VolunteerProfile.Status.ACTIVE,
            user__is_active=True,
        ).order_by("pk").values_list("pk", flat=True))
        actor_profile = VolunteerProfile.objects.filter(user=request.user).first()
        if not actor_profile or actor_profile.role != VolunteerProfile.Role.ADMIN or actor_profile.status != VolunteerProfile.Status.ACTIVE:
            return Response({"detail": "Only an active FURSA administrator can manage volunteers."}, status=status.HTTP_403_FORBIDDEN)
        profile = VolunteerProfile.objects.select_for_update().select_related("user").filter(pk=pk).first()
        if profile is None:
            return Response({"detail": "Volunteer not found."}, status=status.HTTP_404_NOT_FOUND)
        if profile.user_id == request.user.pk:
            return Response({"detail": "You cannot change your own volunteer role or status."}, status=status.HTTP_409_CONFLICT)

        role = request.data.get("role", profile.role)
        state = request.data.get("status", profile.status)
        if not isinstance(role, str) or role not in VolunteerProfile.Role.values:
            return Response({"role": "Choose a valid volunteer role."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(state, str) or state not in VolunteerProfile.Status.values:
            return Response({"status": "Choose a valid volunteer status."}, status=status.HTTP_400_BAD_REQUEST)

        is_active_admin = profile.role == VolunteerProfile.Role.ADMIN and profile.status == VolunteerProfile.Status.ACTIVE and profile.user.is_active
        remains_active_admin = role == VolunteerProfile.Role.ADMIN and state == VolunteerProfile.Status.ACTIVE and profile.user.is_active
        if is_active_admin and not remains_active_admin:
            if len(active_admin_ids) <= 1:
                return Response({"detail": "FURSA must retain at least one active administrator."}, status=status.HTTP_409_CONFLICT)

        old = {"role": profile.role, "status": profile.status}
        profile.role = role
        profile.status = state
        profile.save(update_fields=["role", "status", "updated_at"])
        _audit(request.user, "volunteer.team_member.updated", "VolunteerProfile", profile.pk, {"email": profile.user.email, "before": old, "after": {"role": role, "status": state}})
        return Response({"id": profile.pk, "role": profile.role, "status": profile.status})

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from volunteers.models import AuditEvent, VolunteerProfile


class Command(BaseCommand):
    help = "Grant the volunteer ADMIN role to an existing Django superuser by email."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email address of the existing Django superuser.")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().casefold()
        User = get_user_model()
        user = User.objects.filter(email__iexact=email, is_superuser=True, is_active=True).first()
        if user is None:
            raise CommandError("No active Django superuser exists with that email. Create/verify the superuser first.")
        profile, created = VolunteerProfile.objects.get_or_create(
            user=user,
            defaults={"role": VolunteerProfile.Role.ADMIN, "status": VolunteerProfile.Status.ACTIVE},
        )
        if not created:
            profile.role = VolunteerProfile.Role.ADMIN
            profile.status = VolunteerProfile.Status.ACTIVE
            profile.save(update_fields=["role", "status", "updated_at"])
        AuditEvent.objects.create(
            actor=user,
            action="volunteer.bootstrap_admin.granted",
            object_type="VolunteerProfile",
            object_id=str(profile.pk),
            details={"email": email, "created_profile": created},
        )
        self.stdout.write(self.style.SUCCESS(f"Volunteer ADMIN access is active for {email}."))

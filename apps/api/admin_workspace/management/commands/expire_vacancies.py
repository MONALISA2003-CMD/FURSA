from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.models import Vacancy
from volunteers.models import AuditEvent


class Command(BaseCommand):
    help = "Mark published FURSA vacancies past their internal expiry as expired and audit each change."

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()
        rows = list(Vacancy.objects.select_for_update().filter(
            status=Vacancy.Status.PUBLISHED
        ).filter(Q(expires_at__lte=now) | Q(deadline_at__lte=now)).only("id", "title_original", "country_id"))
        for vacancy in rows:
            vacancy.status = Vacancy.Status.EXPIRED
            vacancy.save(update_fields=["status", "updated_at"])
            AuditEvent.objects.create(
                actor=None, action="vacancy.expired_automatically", object_type="Vacancy",
                object_id=str(vacancy.pk), details={"title": vacancy.title_original, "country": vacancy.country_id},
            )
        self.stdout.write(self.style.SUCCESS(f"Expired {len(rows)} vacancy/vacancies."))

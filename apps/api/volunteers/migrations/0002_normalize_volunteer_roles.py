from django.db import migrations


def normalize_to_admin(apps, schema_editor):
    VolunteerProfile = apps.get_model("volunteers", "VolunteerProfile")
    VolunteerInvitation = apps.get_model("volunteers", "VolunteerInvitation")
    VolunteerProfile.objects.exclude(role="ADMIN").update(role="ADMIN")
    VolunteerInvitation.objects.exclude(role="ADMIN").update(role="ADMIN")


def reverse_noop(apps, schema_editor):
    # Previous role assignments cannot be safely reconstructed after consolidation.
    pass


class Migration(migrations.Migration):
    dependencies = [("volunteers", "0001_initial")]
    operations = [migrations.RunPython(normalize_to_admin, reverse_noop)]

from django.db import migrations


COUNTRIES = [
    ("AE", "United Arab Emirates", "الإمارات العربية المتحدة", 1),
    ("SA", "Saudi Arabia", "المملكة العربية السعودية", 2),
    ("QA", "Qatar", "قطر", 3),
    ("KW", "Kuwait", "الكويت", 4),
    ("BH", "Bahrain", "البحرين", 5),
]

CATEGORIES = [
    ("administration", "Administration", "الإدارة"),
    ("construction", "Construction", "الإنشاءات"),
    ("customer-service", "Customer Service", "خدمة العملاء"),
    ("engineering", "Engineering", "الهندسة"),
    ("finance-accounting", "Finance & Accounting", "المالية والمحاسبة"),
    ("healthcare", "Healthcare", "الرعاية الصحية"),
    ("hospitality", "Hospitality", "الضيافة"),
    ("it-software", "IT & Software", "تقنية المعلومات والبرمجيات"),
    ("logistics-warehouse", "Logistics & Warehousing", "الخدمات اللوجستية والمستودعات"),
    ("sales-marketing", "Sales & Marketing", "المبيعات والتسويق"),
    ("skilled-trades", "Skilled Trades", "المهن الحرفية"),
]


def seed_reference_data(apps, schema_editor):
    Country = apps.get_model("core", "Country")
    Category = apps.get_model("core", "Category")
    for code, name_en, name_ar, sort_order in COUNTRIES:
        Country.objects.update_or_create(
            code=code,
            defaults={"name_en": name_en, "name_ar": name_ar, "enabled": True, "sort_order": sort_order},
        )
    for slug, name_en, name_ar in CATEGORIES:
        Category.objects.update_or_create(
            slug=slug,
            defaults={"name_en": name_en, "name_ar": name_ar, "active": True},
        )


def reverse_seed(apps, schema_editor):
    # Keep reference rows if later vacancies or regions refer to them.
    pass


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [migrations.RunPython(seed_reference_data, reverse_seed)]

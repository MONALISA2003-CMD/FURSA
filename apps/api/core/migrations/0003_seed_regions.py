from django.db import migrations


# Administrative areas are stored under the existing generic Region model.
# Codes are country-prefixed so they remain unambiguous in public query strings.
REGIONS = [
    # United Arab Emirates — seven emirates
    ("AE", "ae-abu-dhabi", "Abu Dhabi", "أبوظبي"),
    ("AE", "ae-dubai", "Dubai", "دبي"),
    ("AE", "ae-sharjah", "Sharjah", "الشارقة"),
    ("AE", "ae-ajman", "Ajman", "عجمان"),
    ("AE", "ae-umm-al-quwain", "Umm Al Quwain", "أم القيوين"),
    ("AE", "ae-ras-al-khaimah", "Ras Al Khaimah", "رأس الخيمة"),
    ("AE", "ae-fujairah", "Fujairah", "الفجيرة"),

    # Saudi Arabia — thirteen administrative regions
    ("SA", "sa-riyadh", "Riyadh", "الرياض"),
    ("SA", "sa-makkah", "Makkah", "مكة المكرمة"),
    ("SA", "sa-madinah", "Madinah", "المدينة المنورة"),
    ("SA", "sa-eastern-province", "Eastern Province", "المنطقة الشرقية"),
    ("SA", "sa-al-qassim", "Al-Qassim", "القصيم"),
    ("SA", "sa-hail", "Hail", "حائل"),
    ("SA", "sa-tabuk", "Tabuk", "تبوك"),
    ("SA", "sa-northern-borders", "Northern Borders", "الحدود الشمالية"),
    ("SA", "sa-jazan", "Jazan", "جازان"),
    ("SA", "sa-najran", "Najran", "نجران"),
    ("SA", "sa-al-baha", "Al Baha", "الباحة"),
    ("SA", "sa-asir", "Asir", "عسير"),
    ("SA", "sa-al-jawf", "Al Jawf", "الجوف"),

    # Qatar — eight municipalities
    ("QA", "qa-doha", "Doha", "الدوحة"),
    ("QA", "qa-al-rayyan", "Al Rayyan", "الريان"),
    ("QA", "qa-al-wakrah", "Al Wakrah", "الوكرة"),
    ("QA", "qa-umm-salal", "Umm Salal", "أم صلال"),
    ("QA", "qa-al-khor-thakhira", "Al Khor & Al Thakhira", "الخور والذخيرة"),
    ("QA", "qa-al-shamal", "Al Shamal", "الشمال"),
    ("QA", "qa-al-daayen", "Al Daayen", "الظعاين"),
    ("QA", "qa-al-shahaniya", "Al Shahaniya", "الشحانية"),

    # Kuwait — six governorates
    ("KW", "kw-capital", "Capital", "العاصمة"),
    ("KW", "kw-hawalli", "Hawalli", "حولي"),
    ("KW", "kw-farwaniya", "Farwaniya", "الفروانية"),
    ("KW", "kw-mubarak-al-kabeer", "Mubarak Al-Kabeer", "مبارك الكبير"),
    ("KW", "kw-ahmadi", "Ahmadi", "الأحمدي"),
    ("KW", "kw-jahra", "Jahra", "الجهراء"),

    # Bahrain — four governorates
    ("BH", "bh-capital", "Capital", "العاصمة"),
    ("BH", "bh-muharraq", "Muharraq", "المحرق"),
    ("BH", "bh-northern", "Northern", "الشمالية"),
    ("BH", "bh-southern", "Southern", "الجنوبية"),
]


def seed_regions(apps, schema_editor):
    Country = apps.get_model("core", "Country")
    Region = apps.get_model("core", "Region")

    for country_code, code, name_en, name_ar in REGIONS:
        # Fail the migration rather than silently attaching areas to a missing country.
        Country.objects.get(code=country_code)
        Region.objects.update_or_create(
            country_id=country_code,
            code=code,
            defaults={"name_en": name_en, "name_ar": name_ar, "enabled": True},
        )


class Migration(migrations.Migration):
    dependencies = [("core", "0002_seed_reference_data")]

    operations = [migrations.RunPython(seed_regions, migrations.RunPython.noop)]

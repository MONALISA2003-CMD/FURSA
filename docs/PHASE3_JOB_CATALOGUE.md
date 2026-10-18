# Phase 3 — First Source-Backed Job Catalogue Slice

## Scope delivered by the original catalogue bundle

- Django models for countries, administrative regions, categories, vacancy records, sources and external application routes.
- Versioned initial migrations and bilingual country/category reference data.
- Public endpoints for job search/listing, job detail, countries, regions and categories.
- Query filtering, pagination, active/deadline/expiry gates, safe external-route checks, and explicit public serializers.
- PostgreSQL full-text search with an SQLite `icontains` fallback so CI tests can run without a PostgreSQL service.
- Next.js English/Arabic search results, country/category filters, paging, job details, source links, last-checked dates and safe external application buttons.
- A narrow CORS allowlist for the deployed public frontend. No credentials or wildcard origins are allowed.

## Phase 3 increment — regional reference data

This increment adds a repeatable Django data migration that seeds **38 bilingual administrative areas** under the existing `Region` model: seven UAE emirates, thirteen Saudi administrative regions, eight Qatar municipalities, six Kuwait governorates and four Bahrain governorates. Each record has a stable country-prefixed code and English/Arabic labels. Prefixes keep query-string codes unambiguous even where more than one country uses a label such as “Capital”.

The existing `GET /api/v1/regions/?country=AE` contract is preserved. The endpoint filters the returned regions to the requested enabled country; the existing frontend already reloads region options when the country changes and clears a previous region selection on country change.

Reference basis: UAE Government (https://u.ae/en/about-the-uae/the-seven-emirates), Saudi National Platform (https://my.gov.sa/en/content/govmechanism), Qatar Ministry of Municipality / QNMP (https://www.mme.gov.qa/QatarMasterPlan/English/MSDP-Municipalities.aspx?panel=about), Kuwait Government Online (https://www.e.gov.kw/sites/kgoenglish/Pages/Visitors/AboutKuwait/KuwaitAtaGlaneTopography.aspx), and the Government of Bahrain (https://www.bahrain.gov.bh/wps/portal/en/BNP/BahrainAtAGlance/AboutBahrain).

The migration is repeatable and does not create vacancy, source or application-route records. It must run through Django migrations during deployment; do not seed production with ad hoc SQL.

## Public API

- `GET /api/v1/jobs/?q=...&country=AE&region=ae-dubai&category=it-software&page=1&page_size=12`
- `GET /api/v1/jobs/{uuid}/`
- `GET /api/v1/countries/`
- `GET /api/v1/regions/?country=AE`
- `GET /api/v1/categories/`
- `GET /api/v1/health/`

Search results include only records that are published, have source provenance, have a checked external application route, include publication and last-checked dates, and have not passed a recorded deadline or expiry. Public serializers do not expose source permission notes, stored source text, internal reviewer notes, or volunteer data.

Website routes require HTTPS. Email routes use `mailto:`. WhatsApp routes are limited to approved HTTPS WhatsApp hosts. Application destinations are rechecked before the frontend renders them.

## Deployment prerequisite — migrate before serving new endpoints

The Render API Start Command must be:

```bash
python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT
```

Save the setting and wait for the API service to finish deploying before uploading this bundle to the GitHub repository root. The ZIP applier runs Django checks, migration consistency checks, backend tests, frontend typecheck and build before committing any payload files.

The Render API environment should include `DATABASE_URL` for the Neon `fursa` database using its application role and TLS, `DJANGO_SECRET_KEY`, `DEBUG=false`, `ALLOWED_HOSTS=fursa-api-1440.onrender.com`, `PYTHON_VERSION=3.12.11`, and `CORS_ALLOWED_ORIGINS=https://fursa-web-a2ot.onrender.com`. The frontend uses `NEXT_PUBLIC_API_BASE_URL=https://fursa-api-1440.onrender.com`.

## Database state and content integrity

The reference migrations seed five countries, eleven bilingual job categories and (with migration 0003) 38 bilingual administrative areas. They intentionally do not seed fake vacancies. Region filters become useful when deployment applies the new migration. Vacancies must be added from permitted, reviewed sources before publication; volunteer review/publication controls and safety reporting remain a later phase.

The current search uses PostgreSQL full-text expressions and conventional btree indexes for status/country, expiry, and category filters. A dedicated GIN full-text index and a measured search-performance benchmark remain follow-up optimization work before pilot sign-off.

## Validation expectations

The ZIP workflow runs `python manage.py check`, `python manage.py makemigrations --check --dry-run`, the Django test suite, `npm run typecheck`, and `npm run build` before committing extracted files. Tests now cover regional counts by country, bilingual labels, country-scoped regions, and combined country/region search alongside existing publication, expiry, source disclosure, route safety, CORS and salary-constraint checks.

A successful workflow validates the source tree against the CI SQLite path and frontend build. After deployment, verify the live database health endpoint and confirm `/api/v1/regions/` returns 38 rows, including seven rows from `/api/v1/regions/?country=AE`.

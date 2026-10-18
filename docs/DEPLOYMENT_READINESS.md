# FURSA Deployment Readiness — 18 October 2026

## Deployed services

- Website: `https://fursa-web-a2ot.onrender.com`
- API: `https://fursa-api-1440.onrender.com`
- Database: Neon project `FURSA`, branch `main`, database `fursa`, PostgreSQL, Frankfurt
- Latest live API/web commit: `7e1d7ceae9424e751240e0b8f2b6066992311f88` (`Apply validated FURSA ZIP bundle`)

## Environment configuration

The Render API service is documented with these settings; secret values must remain private:

- `DATABASE_URL` — Neon `fursa` database, application role `fursa_app`, pooled TLS URL
- `DJANGO_SECRET_KEY` — generated secret
- `DEBUG=false`
- `ALLOWED_HOSTS=fursa-api-1440.onrender.com`
- `PYTHON_VERSION=3.12.11`
- `CORS_ALLOWED_ORIGINS=https://fursa-web-a2ot.onrender.com`

The frontend uses:

- `NEXT_PUBLIC_API_BASE_URL=https://fursa-api-1440.onrender.com`

Do not copy database URLs, passwords, or Django secrets into GitHub, this document, screenshots, or chat messages.

## Manual smoke test on a phone

1. Open `https://fursa-api-1440.onrender.com/`. The response should be JSON identifying `fursa-api`.
2. Open `https://fursa-api-1440.onrender.com/api/v1/health/`. The successful response should include `"status":"ok"` and `"database":"connected"`.
3. Open `https://fursa-api-1440.onrender.com/api/v1/countries/` and `https://fursa-api-1440.onrender.com/api/v1/jobs/` to confirm reference data and the paginated job endpoint load. The listing is expected to be empty until real reviewed jobs are published.
4. Open `https://fursa-api-1440.onrender.com/api/v1/regions/` and confirm 38 rows; `https://fursa-api-1440.onrender.com/api/v1/regions/?country=AE` should return seven. The production database and migration were verified; this explicit public HTTP smoke request was not present in the Render request logs during the operations pass.
5. Open `https://fursa-web-a2ot.onrender.com/en` and `https://fursa-web-a2ot.onrender.com/ar` to confirm both frontend locales load and the search page can call the API.
6. If the health endpoint says `database: unavailable`, do not paste the URL into chat. Open Render → API service → Environment and confirm `DATABASE_URL` exists; then inspect Render logs. Rotate the database role password and update Render if connection credentials were exposed.

## Render health check setting

The API service health-check path is `/`, a lightweight liveness check. The API root returns HTTP 200 without querying PostgreSQL. Use `/api/v1/health/` for a manual dependency/readiness check: it executes `SELECT 1` against the configured database. Avoid using this database-dependent endpoint as the deploy-gating health path unless the team deliberately chooses that behaviour, because a database outage could then block deployment.

## Runtime consistency

The latest Render API build logs confirm Python `3.12.11`, matching the repository's `.python-version` and GitHub Actions validation runtime.

## Phase 3 deeper increment

The API now requires a public route to have a check timestamp and to be supported by a source attached to the same vacancy. Public results exclude disabled countries, inactive categories and cross-country/disabled regions. Query parameters are validated rather than silently ignoring invalid work modes, employment types or sort values. Search terms are limited to 160 characters, and the existing API routes and response shape are preserved.

## Region migration verification — passed 18 October 2026

The earlier source/database discrepancy is resolved. The latest Render API startup logs show `Applying core.0003_seed_regions... OK` at 15:11:45 UTC on 18 October 2026. A subsequent instance reported `No migrations to apply`, as expected after the migration completed.

Read-only verification against the FURSA Neon project `proud-dream-05948771`, main branch `br-dawn-cell-b96d38co`, database `fursa` confirms that `core.0003_seed_regions` is recorded and the reference data contains **38 enabled regions across five countries**: AE 7, SA 13, QA 8, KW 6, BH 4. A duplicate `(country_id, code)` query returned no duplicates. The database contains five countries, eleven categories and zero vacancies. No ad-hoc production inserts were used.

Both Render services report the latest commit as live. Render health-check traffic to the API root returned HTTP 200. The database migration and region counts are verified; the manual public HTTP endpoint smoke test above remains useful to confirm the response through the public route.

## Migration and current scope

The API Start Command applies migrations before Gunicorn starts:

```bash
python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT
```

The regional migration seeds 38 bilingual administrative areas. It creates no vacancy, source or application-route records. Do not seed production with ad-hoc SQL, and never publish invented vacancies. Volunteer review/publication controls and safety reporting are later-phase work. A PostgreSQL GIN full-text index remains a measured optimization follow-up: benchmark against representative, approved non-production data before changing the search index.

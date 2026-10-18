# FURSA Deployment Readiness — 18 October 2026

## Deployed services

- Website: `https://fursa-web-a2ot.onrender.com`
- API: `https://fursa-api-1440.onrender.com`
- Database: Neon project `FURSA`, branch `main`, database `fursa`, PostgreSQL 17, Frankfurt

## Environment configuration

The Render API service has these settings merged into its Environment configuration; secret values must remain private:

- `DATABASE_URL` — Neon `fursa` database, application role `fursa_app`, pooled TLS URL
- `DJANGO_SECRET_KEY` — generated secret
- `DEBUG=false`
- `ALLOWED_HOSTS=fursa-api-1440.onrender.com`
- `PYTHON_VERSION=3.12.11`
- `CORS_ALLOWED_ORIGINS=https://fursa-web-a2ot.onrender.com`

The Render frontend service has:

- `NEXT_PUBLIC_API_BASE_URL=https://fursa-api-1440.onrender.com`

Do not copy database URLs, passwords, or Django secrets into GitHub, this document, screenshots, or chat messages.

## Manual smoke test on a phone

1. Open `https://fursa-api-1440.onrender.com/`. The response should be JSON identifying `fursa-api`.
2. Open `https://fursa-api-1440.onrender.com/api/v1/health/`. The successful response should include `"status":"ok"` and `"database":"connected"`.
3. Open `https://fursa-api-1440.onrender.com/api/v1/countries/` and `/api/v1/jobs/` to confirm reference data and the paginated job endpoint load. The listing is expected to be empty until real reviewed jobs are published.
4. After Phase 3 regional migration deploys, open `/api/v1/regions/` and confirm 38 rows; `/api/v1/regions/?country=AE` should return seven.
5. Open `https://fursa-web-a2ot.onrender.com/en` and `https://fursa-web-a2ot.onrender.com/ar` to confirm both frontend locales load and the search page can call the API.
6. If the health endpoint says `database: unavailable`, do not paste the URL into chat. Open Render → API service → Environment and confirm `DATABASE_URL` exists; then inspect Render logs. Rotate the database role password and update Render if connection credentials were exposed.

## Render health check setting

The connected Render tool can inspect services and set environment variables, but it cannot edit the service's `healthCheckPath` field. Set this from the Render dashboard:

1. Open the API service in Render.
2. Open **Settings** and find **Health Check Path**.
3. Set it to `/` for the current lightweight liveness check. The API root returns HTTP 200 for GET and does not query PostgreSQL.
4. Save the setting and wait for Render to apply it.

Use `/api/v1/health/` for a manual dependency/readiness check: it executes `SELECT 1` against the configured database. Avoid using this database-dependent endpoint as the deploy-gating health path until the team deliberately chooses that behaviour, because a database outage could then block deployment.

## Runtime consistency

Render's previous logs showed Python 3.14.8, while GitHub Actions tests on Python 3.12. The Render API environment is pinned to `PYTHON_VERSION=3.12.11`, and `.python-version` keeps the repository default consistent. Verify the next API build logs say Python 3.12.11.

## Phase 3 deeper increment

The API now requires a public route to have a check timestamp and to be supported by a source attached to the same vacancy. Public results exclude disabled countries, inactive categories and cross-country/disabled regions. Query parameters are validated rather than silently ignoring invalid work modes, employment types or sort values. These rules keep the existing public API contract but may return HTTP 400 for malformed search filters.

### Region migration verification is a release gate

A read-only inspection of the FURSA Neon project on 18 October 2026 found `core_region` still empty and `django_migrations` containing `core.0001_initial` and `core.0002_seed_reference_data`, but not `core.0003_seed_regions`. Render's latest API startup logs reported “No migrations to apply” despite the current repository tree containing `0003_seed_regions.py`. This is a source/database consistency discrepancy; do not treat the prior deploy as proof the regions were seeded.

After the next validated bundle deploy, inspect Render API application logs for the migration result, then read the FURSA Neon `fursa` database to verify `core.0003_seed_regions` is recorded and `core_region` contains 38 enabled rows (AE 7, SA 13, QA 8, KW 6, BH 4). If the migration is still reported as not pending and the FURSA Neon database remains empty, stop and resolve the API's database-target/source mismatch before trying any manual data correction. Never seed these tables with ad-hoc SQL.

## Migration and current scope

The API Start Command must apply migrations before Gunicorn starts:

```bash
python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT
```

The deployed baseline currently has no region rows. This Phase 3 increment adds migration 0003 to seed 38 bilingual administrative areas; those rows appear only after the migration is applied during deployment. The change deliberately creates no vacancy, source or application-route records. Volunteer review/publication controls and safety reporting remain later-phase work. PostgreSQL full-text queries are present; a dedicated GIN index and measured search-performance benchmark remain follow-up work before pilot sign-off.

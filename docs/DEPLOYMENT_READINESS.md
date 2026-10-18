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
4. Open `https://fursa-web-a2ot.onrender.com/en` and `https://fursa-web-a2ot.onrender.com/ar` to confirm both frontend locales load and the search page can call the API.
5. If the health endpoint says `database: unavailable`, do not paste the URL into chat. Open Render → `fursa-api` → Environment and confirm `DATABASE_URL` exists; then inspect Render logs for the service. Rotate the database role password and update Render if connection credentials were exposed.

## Render health check setting

The connected Render tool can inspect services and set environment variables, but it cannot edit the service's `healthCheckPath` field. Set this from the Render dashboard on your phone:

1. Open the `fursa-api` service in Render.
2. Open **Settings** and find **Health Check Path**.
3. Set it to `/` for the current lightweight liveness check. The API root returns HTTP 200 for GET and does not query PostgreSQL.
4. Save the setting and wait for Render to apply it.

Use `/api/v1/health/` for a manual dependency/readiness check: it executes `SELECT 1` against the configured database. Avoid using this database-dependent endpoint as the deploy-gating health path until the team deliberately chooses that behavior, because a database outage could then block deployment.

## Runtime consistency

Render's latest logs originally showed Python 3.14.8, while GitHub Actions tests on Python 3.12. The Render API environment is now pinned to `PYTHON_VERSION=3.12.11`, and the included `.python-version` file keeps the repo default consistent. Verify the next Render build logs say Python 3.12.11.

## Migration and current scope

Before deploying the job-catalogue bundle, set the Render API Start Command to `python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT`. This is required so Django applies the new versioned schema before serving traffic.

The job-catalogue bundle introduces the first source-backed product schema, public search/detail endpoints, bilingual country/category reference data, source-safe serializers, and the Next.js search/detail journey. It intentionally creates no fake or sample vacancies. There are no region rows yet, and the volunteer review/publication workflow and safety reporting remain later-phase work. PostgreSQL full-text queries are present; a dedicated GIN index and the search-performance benchmark remain follow-up work before pilot sign-off.

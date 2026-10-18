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
3. Open `https://fursa-web-a2ot.onrender.com/en` and `https://fursa-web-a2ot.onrender.com/ar` to confirm both frontend locales load.
4. If the health endpoint says `database: unavailable`, do not paste the URL into chat. Open Render → `fursa-api` → Environment and confirm `DATABASE_URL` exists; then inspect Render logs for the service. Rotate the database role password and update Render if connection credentials were exposed.

## Render health check setting

The connected Render tool can inspect services and set environment variables, but it cannot edit the service's `healthCheckPath` field. Set this from the Render dashboard on your phone:

1. Open the `fursa-api` service in Render.
2. Open **Settings** and find **Health Check Path**.
3. Set it to `/` for the current lightweight liveness check. The API root returns HTTP 200 for GET and does not query PostgreSQL.
4. Save the setting and wait for Render to apply it.

Use `/api/v1/health/` for a manual dependency/readiness check: it executes `SELECT 1` against the configured database. Avoid using this database-dependent endpoint as the deploy-gating health path until the team deliberately chooses that behavior, because a database outage could then block deployment.

## Runtime consistency

Render's latest logs originally showed Python 3.14.8, while GitHub Actions tests on Python 3.12. The Render API environment is now pinned to `PYTHON_VERSION=3.12.11`, and the included `.python-version` file keeps the repo default consistent. Verify the next Render build logs say Python 3.12.11.

## Current scope gap

The Neon database has not yet been migrated to the FURSA product schema. Its table inventory currently shows only `fursa_project_metadata`. The job catalogue, source records, application routes, publication gates, review queue and safety reporting remain product work. Start the next feature slice with Django models and migrations, then public job search/detail API and a real Next.js search/detail journey.

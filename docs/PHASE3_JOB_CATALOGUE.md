# Phase 3 — First Source-Backed Job Catalogue Slice

## Scope delivered by this bundle

- Django models for countries, administrative regions, categories, vacancy records, sources and external application routes.
- Versioned initial migrations and bilingual country/category reference data.
- Public endpoints for job search/listing, job detail, countries, regions and categories.
- Query filtering, pagination, active/deadline/expiry gates, safe external-route checks, and explicit public serializers.
- PostgreSQL full-text search with an SQLite `icontains` fallback so CI tests can run without a PostgreSQL service.
- Next.js English/Arabic search results, country/category filters, paging, job details, source links, last-checked dates and safe external application buttons.
- A narrow CORS allowlist for the deployed public frontend. No credentials or wildcard origins are allowed.

## Public API

- `GET /api/v1/jobs/?q=...&country=AE&category=it-software&page=1&page_size=12`
- `GET /api/v1/jobs/{uuid}/`
- `GET /api/v1/countries/`
- `GET /api/v1/regions/?country=AE`
- `GET /api/v1/categories/`
- `GET /api/v1/health/`

Search results include only records that are published, have source provenance, have a checked external application route, include publication and last-checked dates, and have not passed a recorded deadline or expiry. Public serializers do not expose source permission notes, stored source text, internal reviewer notes, or volunteer data.

Website routes require HTTPS. Email routes use `mailto:`. WhatsApp routes are limited to approved HTTPS WhatsApp hosts. Application destinations are rechecked before the frontend renders them.

## Deployment prerequisite — migrate before serving new endpoints

Before uploading this product bundle, open Render → `fursa-api` → Settings and set Start Command to:

```bash
python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT
```

Save it and wait for Render to complete the deployment. Then upload `FURSA_PHASE3_JOB_CATALOGUE_BUNDLE.zip` to the GitHub repository root. The auto-deploy caused by the bundle-applier's commit will run migrations before Gunicorn starts, applying the new schema.

The Render API environment should include:

- `DATABASE_URL` pointing to Neon database `fursa` using the application role and TLS.
- `DJANGO_SECRET_KEY` generated in Render's environment settings.
- `DEBUG=false`.
- `ALLOWED_HOSTS=fursa-api-1440.onrender.com`.
- `PYTHON_VERSION=3.12.11`.
- `CORS_ALLOWED_ORIGINS=https://fursa-web-a2ot.onrender.com`.

The frontend environment should include `NEXT_PUBLIC_API_BASE_URL=https://fursa-api-1440.onrender.com`.

## Database state and content integrity

The migrations seed only five countries and broad bilingual job categories. They intentionally do not seed fake jobs. There are no region rows in this initial seed migration; region filtering will return results after maintained region reference data is loaded. Vacancies must be added from permitted, reviewed sources before publication. The volunteer review and publication gates are the next phase and are not claimed as delivered by this bundle.

The current search uses PostgreSQL full-text expressions and conventional btree indexes for state/country, expiry, and category filters. A dedicated GIN full-text index and the agreed search-performance benchmark remain follow-up optimization work before pilot sign-off.

## Validation expectations

The hardened ZIP workflow runs `python manage.py check`, the Django test suite, `npm run typecheck`, and `npm run build` after extracting these files and before it commits. The test suite covers public-vs-draft filtering, expired listing exclusion, safe application routes, source evidence non-disclosure, search filters, reference endpoints, CORS allowlisting, and the salary range constraint.

Passing this workflow validates the source tree on the CI SQLite path and the frontend build; the final live database connection must still be checked in the Render logs/browser after deployment.

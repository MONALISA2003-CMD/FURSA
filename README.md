# FURSA (فرصة)

**Your Next Opportunity Starts Here.**

FURSA is a bilingual Arabic/English Gulf job-discovery platform. Its canonical product, architecture, data-model, acceptance-criteria and delivery requirements live in [`docs/ENGINEERING_SOURCE_OF_TRUTH.md`](docs/ENGINEERING_SOURCE_OF_TRUTH.md). The current Render + Neon deployment decision is recorded in [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) pending consolidation into the source-of-truth document.

## Current implementation

- `apps/web`: Next.js App Router, React and TypeScript public UI with English/Arabic routes, a database-backed search interface, and job-detail views.
- `apps/api`: Django + Django REST Framework public API with liveness/readiness endpoints, vacancy/source/application-route models, bilingual country/category reference data, filtering, pagination, and source-safe public serializers.
- Database: Neon PostgreSQL, project `FURSA`, database `fursa`, Frankfurt.
- Hosting: Render web services for the frontend and API.
- CI: GitHub Actions runs Django checks/tests and frontend typecheck/build.

The catalogue intentionally contains no invented or sample vacancies. Search remains empty until real source-backed records are added and reviewed for publication. Volunteer review, reports, and publication permissions are the next product phase.

## Local development

### API

```bash
cd apps/api
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py test
python manage.py runserver 8000
```

API root: `http://127.0.0.1:8000/`  
Database-aware health: `http://127.0.0.1:8000/api/v1/health/`  
Job search: `http://127.0.0.1:8000/api/v1/jobs/`

Local development defaults to SQLite. Set `DATABASE_URL` to a PostgreSQL URL when you want to exercise PostgreSQL search locally.

### Web

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`.

## Environment variables

Copy `.env.example` to `.env` for local use. Never commit real secrets. The Render API service uses `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DEBUG=false`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS`. The frontend uses `NEXT_PUBLIC_API_BASE_URL`, set to the API base URL without `/api/v1` at the end.

## Render migration start command

The API's Render Start Command must apply Django migrations before starting Gunicorn:

```bash
python apps/api/manage.py migrate --noinput && gunicorn --chdir apps/api config.wsgi:application --bind 0.0.0.0:$PORT
```

Make this Render setting change before deploying the job-catalogue bundle so the new database tables are created automatically. Migrations are versioned in Git; do not create the schema with ad hoc SQL.

## Phone-friendly ZIP workflow

The updater is `.github/workflows/apply-any-fursa-zip.yml`. Workflow YAML must be installed or updated separately through GitHub's file editor; do not put workflow files inside a bundle because GitHub Actions' standard token cannot create/update workflow files without extra permission.

For each bundle, upload its ZIP to the repository root on branch `main`. The updater validates `manifest.json`, only changes listed paths, runs backend checks/tests and frontend typecheck/build, and commits the extracted files only if checks pass. Upload one bundle at a time, wait for its Actions run to finish, and review the resulting commit before uploading the next.

See [`docs/PHASE3_JOB_CATALOGUE.md`](docs/PHASE3_JOB_CATALOGUE.md) and [`docs/DEPLOYMENT_READINESS.md`](docs/DEPLOYMENT_READINESS.md) for deployment checks and known limitations.

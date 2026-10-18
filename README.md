# FURSA (فرصة)

**Your Next Opportunity Starts Here.**

FURSA is a bilingual Arabic/English Gulf job-discovery platform. The product requirements, architecture, data model, acceptance criteria and phased roadmap are described in `docs/ENGINEERING_SOURCE_OF_TRUTH.md`. The accepted Render + Neon deployment decision is recorded in `docs/ARCHITECTURE_DECISIONS.md` pending consolidation into the source-of-truth document.

## Current application scaffold

- `apps/web`: Next.js App Router, React and TypeScript public UI with English/Arabic routes.
- `apps/api`: Django + Django REST Framework API with root and database-aware health endpoints.
- PostgreSQL: Neon project `FURSA`, database `fursa`, Frankfurt region.
- Hosting: Render web services for the frontend and API.
- CI: GitHub Actions tests backend and typechecks/builds frontend.

The current website is a scaffold, not a completed job catalogue. Job records, search, job detail API endpoints and volunteer review workflow remain to be implemented according to the engineering roadmap.

## Local development

### API

```bash
cd apps/api
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py test
python manage.py runserver 8000
```

The database-aware health endpoint is `http://127.0.0.1:8000/api/v1/health/`. By default, local development can use SQLite. Set `DATABASE_URL` to a PostgreSQL connection URL to use PostgreSQL locally.

### Web

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`.

## Environment variables

Copy `.env.example` to `.env` for local settings. Never commit real secrets. Render must hold `DATABASE_URL`, `DJANGO_SECRET_KEY`, `DEBUG=false`, and a restricted `ALLOWED_HOSTS` value in its Environment settings. The frontend uses `NEXT_PUBLIC_API_BASE_URL`; it must point to the deployed API base URL without a trailing `/api/v1` suffix unless the frontend code explicitly expects one.

## Phone-friendly ZIP workflow

The updater workflow is `.github/workflows/apply-any-fursa-zip.yml`. Workflow YAML must be installed or updated separately through GitHub's file editor; do not put workflow files in an automatic bundle because the standard GitHub Actions token cannot create/update workflow files without extra permission.

For a bundle update:

1. Upload the bundle ZIP to the repository root on branch `main`.
2. The updater validates `manifest.json`, writes only paths in `manifest.replace`, deletes only explicitly listed paths in `manifest.delete`, runs backend/frontend checks, and commits if checks pass.
3. Review the Actions run and resulting commit. If the checks fail, the update is not committed.

The workflow must be installed first from the separate hardened workflow file supplied in the phone setup kit. Do not upload an infrastructure bundle containing `.github/workflows/` paths.

## Product boundary

The MVP is an evidence-backed job catalogue first: public search, job details, source information, last-checked date and external application routes. Volunteer review and safety reporting follow. AI suggestions are later-phase functionality and must never publish jobs automatically.

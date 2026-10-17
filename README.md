# FURSA (فرصة)

**Your Next Opportunity Starts Here.**

FURSA is a bilingual Arabic/English Gulf job-discovery platform. The authoritative product, UX, architecture, stack, requirements and phased roadmap are in [`docs/ENGINEERING_SOURCE_OF_TRUTH.md`](docs/ENGINEERING_SOURCE_OF_TRUTH.md).

## Initial repository scaffold

This bundle starts the project with:

- `apps/web`: Next.js public UI in Arabic and English, using responsive FURSA styles.
- `apps/api`: Django + Django REST Framework API with a health endpoint and PostgreSQL-ready settings.
- `docs/ENGINEERING_SOURCE_OF_TRUTH.md`: single engineering authority.
- `.github/workflows/ci.yml`: backend tests and frontend type/build checks.
- `.github/workflows/apply-fursa-bundle.yml`: add manually from the companion workflow file; it applies the bundle.

The current UI is a scaffold, not a completed job catalogue. The initial job search/listing data workflow is implemented in the later phases in the source-of-truth document.

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
python manage.py runserver 8000
```

Health check: `http://127.0.0.1:8000/api/v1/health/`.

By default local development uses SQLite. Set `DATABASE_URL` to a PostgreSQL URL to use PostgreSQL, for example `postgresql://USER:PASSWORD@HOST:5432/DATABASE`.

### Web

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000/en` or `http://localhost:3000/ar`.

## Environment variables

Copy `.env.example` to `.env` at the repository root for local settings. Never commit real secrets. Render and CI must receive secrets through environment settings, not source files.

## GitHub bundle updates

The repository-level `.github/workflows/apply-fursa-bundle.yml` reads `FURSA_BOOTSTRAP_BUNDLE.zip` from the repository root. The ZIP contains `manifest.json` and a `payload/` directory. Files in `manifest.replace` are created or replaced; only files explicitly listed in `manifest.delete` are deleted. Unlisted files are preserved. The updater refuses path traversal, symlinks in the ZIP, Git internals, and replacement or deletion of the updater workflow itself. The updater file is deliberately managed manually and is not inside the ZIP.

To use the updater, add the workflow file first, then commit the ZIP at the repository root. It runs when the ZIP changes or can be started manually from **Actions → Apply FURSA Bundle → Run workflow**.

For pushes by the workflow to succeed, repository Settings → Actions → General → Workflow permissions must allow **Read and write permissions**. A branch rule that blocks GitHub Actions pushes must also allow this update or be changed. The workflow has a limited `contents: write` permission and runs only on an explicit bundle upload or manual dispatch.

## What is not wired yet

No production database, hosting service, AI key, or production secrets are included. Do not send passwords or API keys in chat. Connect Render when ready to provision the approved PostgreSQL/hosting resources; add only the generated service URLs and credentials to Render's environment settings.

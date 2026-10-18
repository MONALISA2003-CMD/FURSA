# FURSA Phase 3 — Deeper API hardening

## Scope

This increment stays within the current FURSA monorepo, Django REST Framework API, Next.js web client and FURSA Neon database. It does not add a new service, candidate account system, AI provider, sample vacancy or ad-hoc database seed.

### Public catalogue integrity

- Publish only vacancies whose country is enabled, whose category is active (when set), and whose region is either absent or enabled and attached to the same country.
- Require the vacancy to have a publication timestamp, last-checked timestamp, source evidence and an unexpired deadline/expiry state.
- Require a public application route to be marked OK, include its own last-checked timestamp, pass route-scheme checks, and use a supporting source attached to the same vacancy.
- Use the same gated queryset for public list and detail endpoints.

### Search API contract

- `q`: trimmed keyword query with a 160-character upper bound.
- `country`, `region`, `category`: retain existing query names and filters. Region codes are country-prefixed.
- `work_mode`: one of `ONSITE`, `HYBRID`, `REMOTE`, or omitted.
- `employment_type`: one of the documented `Vacancy.EmploymentType` values or omitted.
- `sort`: `newest` or `checked`, or omitted (defaults to `newest`).
- Invalid enum and sort values return HTTP 400 instead of silently producing a different query. Page sizes remain bounded by the existing API pagination class.

### Safe rollout

1. Upload one ZIP to the FURSA repository root on `main`.
2. Wait for “Apply Any FURSA ZIP” to complete. It must pass Django `check`, migration consistency, backend tests, frontend typecheck and build before the application files are committed.
3. Verify the resulting commit and Render API/web deployments only in the confirmed `My Workspace`.
4. Inspect API migration logs and then query only the FURSA project in Neon. The migration should create the reference data; do not issue manual insert/update SQL.
5. Verify `/api/v1/health/`, `/api/v1/regions/`, `/api/v1/regions/?country=AE`, and the English/Arabic public pages. The job catalogue should remain empty until genuine source-backed vacancies are reviewed and published.

## Known release gate

A read-only check on 18 October 2026 found the FURSA Neon `fursa` database still had zero regions and only core migrations 0001/0002 recorded even though Render API startup logs said “No migrations to apply.” This is unresolved. The next deployment must establish whether the API process is using the intended FURSA Neon database and the current source tree. Do not report Phase 3 production-ready until `0003_seed_regions` is recorded and the 38 region rows are verified.

## Deliberately deferred

- GIN index for the full-text search vector: benchmark with representative, non-production listings first.
- Volunteer review/report workflow: Phase 4.
- Automated ingestion and AI extraction: later phase, after source collection and manual review are stable.

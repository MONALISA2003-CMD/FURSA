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

### Safe rollout and validation

The ZIP workflow was used to apply the code bundle. The resulting commit is `7e1d7ceae9424e751240e0b8f2b6066992311f88`; the workflow commits extracted application files only after running Django `check`, migration consistency, backend tests, frontend typecheck and build. Both Render API and web services are now live at this commit.

The latest Render API logs show `Applying core.0003_seed_regions... OK` at 15:11:45 UTC. Read-only queries against FURSA Neon project `proud-dream-05948771`, branch `br-dawn-cell-b96d38co`, database `fursa` confirm `core.0003_seed_regions` is recorded, all 38 expected regions are enabled (AE 7, SA 13, QA 8, KW 6, BH 4), and there are no duplicate `(country_id, code)` pairs. The database contains zero vacancies by design: no fake job records were created. Render confirms Python 3.12.11, and API root health-check traffic returned HTTP 200.

A direct public request to `/api/v1/regions/` was not present in Render request logs during this operations pass, so open these routes once in a browser for a final HTTP smoke check:

- `https://fursa-api-1440.onrender.com/api/v1/health/`
- `https://fursa-api-1440.onrender.com/api/v1/regions/`
- `https://fursa-api-1440.onrender.com/api/v1/regions/?country=AE`
- `https://fursa-web-a2ot.onrender.com/en`
- `https://fursa-web-a2ot.onrender.com/ar`

The migration/data release gate is passed. This final browser smoke check is separate from that verified database state.

## Deliberately deferred optimization and later phases

- GIN index for the full-text search vector: benchmark first using representative, approved non-production listings; no real vacancies exist in the current catalogue, so do not claim an empty-table benchmark proves production performance.
- Volunteer review/report workflow: Phase 4.
- Automated ingestion and AI extraction: later phase, after source collection and manual review are stable.

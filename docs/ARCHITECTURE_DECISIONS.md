# FURSA Architecture Decisions

## ADR-0001 — Render for applications, Neon for PostgreSQL

- **Status:** Accepted for the current deployment
- **Date:** 2026-10-18
- **Scope:** Development/staging baseline; not a statement that public launch is approved

### Context

The engineering source-of-truth baseline originally described Render as the host for both applications and managed PostgreSQL. The connected accounts now contain two FURSA Render web services (`fursa-web` and `fursa-api`) and an existing Neon project named `FURSA` with database `fursa`. The owner explicitly asked to use the connected Render and Neon services.

### Decision

Use Render for the Next.js website and Django API. Use Neon PostgreSQL as the authoritative application database. Keep the app and database in Frankfurt for this baseline. The Django API uses the Neon pooled TLS connection for normal runtime traffic. Use a direct/non-pooled Neon connection for schema migrations and database administration when a dedicated migration workflow is introduced.

### Consequences

- `DATABASE_URL` is configured in the Render API service's environment, not in Git or frontend code.
- The frontend's `NEXT_PUBLIC_API_BASE_URL` points to the Render API service.
- Schema changes must be committed as Django migrations and tested before deployment.
- Do not create a second database on Render or a duplicate Neon project for the same application.
- Consolidate this decision into Section 5 of `docs/ENGINEERING_SOURCE_OF_TRUTH.md` so the engineering source of truth remains the canonical document.

### Verification status

Render reports both app services deployed and live, and a read-only query to Neon succeeded against database `fursa`. A public request to `/api/v1/health/` has not been verified from the ChatGPT execution environment; test it from a browser and confirm it reports `database: connected` before claiming end-to-end connectivity is verified.

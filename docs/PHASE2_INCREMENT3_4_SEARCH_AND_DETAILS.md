# FURSA Phase 2 — Increments 3 and 4: Search and Job Details

**Scope:** Refine the existing public search-results and vacancy-detail routes using the approved Royal Blue + Coral Red design system. This bundle also ensures the canonical brand-token stylesheet is imported by the root layout, so the selected Royal Blue + Coral Red CSS variables are actually available to the public pages. It does not change the database schema, API, Render configuration, publication permissions, or workflow files.

## Increment 3 — Search results

- Reorganises search controls so keyword and country are the primary controls.
- Adds a mobile filter drawer for region, category, work mode, employment type, and sort order.
- Adds an Escape-key close behaviour and temporary body scroll lock while the drawer is open.
- Adds active filter chips with individual removal and clear-all actions.
- Keeps the current API contract (`q`, `country`, `region`, `category`, `work_mode`, `employment_type`, `sort`, `page`, `page_size`).
- Carries the current search, filter, sort, and page state into each job-detail link, then returns the user to that exact search when they choose Back to job search.
- Adds local SVG country flags to country labels and result cards.
- Refines cards to show title, employer, location/work facts, publication date, last-checked date, original source link, and a details action.
- Separates loading, API error, empty-search, and empty-catalogue states.
- Provides retry behaviour for failed requests and pagination controls with page count.
- Keeps all UI copy in English and Arabic, with RTL-aware arrow positioning.

## Increment 4 — Job details

- Adds a stronger job summary with flag, country, optional region/category, employment type and work mode.
- Separates FURSA publication, original posting, last-checked, and application-deadline dates.
- Adds source/freshness presentation and explains that a working link does not guarantee the vacancy is genuine or still open.
- Improves salary display for a minimum-only, maximum-only, or range value without inventing missing data.
- Labels application buttons by route type (website, email, WhatsApp).
- Validates application destinations in the client presentation layer: HTTPS for website/WhatsApp and a constrained `mailto:` shape for email; WhatsApp is limited to `wa.me` and `api.whatsapp.com`.
- Restricts displayed source links to HTTPS URLs and opens external links with safe `rel` attributes.
- Adds responsive layout and avoids a sticky application panel on narrow screens.
- Validates the return path as a same-site job-search route, avoiding an external redirect through the `returnTo` parameter.
- Adds an explicit empty/unavailable application-route message instead of a dead or fabricated link.
- Keeps English and Arabic messages for errors, empty fields, metadata, and calls to action.

## Shared brand-token dependency correction

The current root layout imported `globals.css` but did not import `brand-tokens.css`, despite the shared FURSA stylesheet referencing `--brand-*` custom properties. This increment adds the missing import to `apps/web/app/layout.tsx` after `globals.css`, allowing the canonical tokens and compatibility aliases to take effect. This fix is important for consistent appearance across the homepage, job search, and detail page.

## Validation plan

The ZIP updater is configured to run the Django system check, migration consistency check, backend tests, frontend typecheck, and production build before committing extracted application files. The bundle itself is checked for manifest/payload parity and TypeScript/TSX syntax before delivery. A green Actions run and live browser review are still required to consider these increments deployed and accepted.

## Files included

- `apps/web/app/layout.tsx` (imports the canonical brand token stylesheet)
- `apps/web/app/[locale]/jobs/page.tsx` (bounded query parameter parsing and initial state)
- `apps/web/app/[locale]/jobs/JobResults.tsx`
- `apps/web/app/[locale]/jobs/jobs.css`
- `apps/web/app/[locale]/jobs/[id]/page.tsx` (safe return-path handling)
- `apps/web/app/[locale]/jobs/[id]/JobDetailClient.tsx`
- `docs/PHASE2_INCREMENT3_4_SEARCH_AND_DETAILS.md`

## Known limits

- The public job catalogue is currently empty, so result cards and a populated job-detail view cannot be verified with real production records until a reviewed vacancy is added.
- The region reference endpoint currently returns an empty list, so region filtering remains present but has no options until approved region data is seeded.
- The report-job workflow is not implemented in these increments; this bundle does not add a dead report button.
- The frontend checks route URLs for safe display, but backend validation and publication controls remain the authoritative security boundary.

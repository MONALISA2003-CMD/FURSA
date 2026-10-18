# FURSA Phase 2 — Increment 2: Homepage, Country Flags, and Category Icons

**Status:** Prepared for GitHub Actions validation and deployment.
**Depends on:** Increment 1 — Royal Blue + Coral Red design tokens.

## Scope

This increment refines the homepage in the current Next.js application without changing Render, Neon, the Django models, or the GitHub workflows.

### Included

- Reworks the homepage hero so the heading and search remain the primary action, while the official recoloured FURSA logo supports the brand rather than dominating the screen.
- Uses the current `--brand-*` tokens from `apps/web/app/brand-tokens.css`.
- Fetches country and category reference data from `/api/v1/countries/` and `/api/v1/categories/` rather than maintaining a second hard-coded list in the homepage.
- Adds local SVG flags for AE, SA, QA, KW, and BH under `apps/web/public/flags/`.
- Replaces all homepage category Unicode symbols with a consistent inline SVG icon treatment keyed by the stable category slug.
- Keeps the visible category and country labels. Flags and icons are decorative supplements, not replacements for text.
- Adds reference-data loading skeletons, separate error states, retry controls, and empty-reference states.
- Keeps keyword search available when the country reference list cannot load; the country selector is disabled until valid country data arrives.
- Maintains the existing English/Arabic copy, locale route, query parameters, source-first message, honest zero-job catalogue language, keyboard focus styles, and responsive layout.
- Adds a reduced-motion rule for the reference-data skeleton animation.

## Files changed

- `apps/web/app/[locale]/page.tsx`
- `apps/web/app/[locale]/HomeContent.tsx` (new)
- `apps/web/app/[locale]/fursa-ui.css`
- `apps/web/public/flags/ae.svg` (new)
- `apps/web/public/flags/sa.svg` (new)
- `apps/web/public/flags/qa.svg` (new)
- `apps/web/public/flags/kw.svg` (new)
- `apps/web/public/flags/bh.svg` (new)

## Technical notes

- No new npm dependencies are introduced. Category icons are lightweight inline SVG to avoid dependency churn in this small increment.
- The icon mapping is keyed by category slug; labels come from the API.
- Country names and codes come from the API; country code selects the local flag asset.
- If reference API requests fail, the page presents an explicit retry state rather than quietly substituting duplicated hard-coded data.
- Job counts are not fabricated.
- The logo artwork itself is not modified in this increment; it uses the official recoloured image delivered in Increment 1.

## Validation

The bundle should pass the repository's existing workflow before the changes are considered deployed:

1. `python manage.py check`
2. `python manage.py makemigrations --check --dry-run`
3. `python manage.py test`
4. `npm ci`
5. `npm run typecheck`
6. `npm run build`

After a green run, check both `/en` and `/ar` on a phone, including the country cards, category cards, search form, API-failure retry state, and footer. Confirm the country card links use the country codes and category card links use the category slugs accepted by the job results page.

## Not included

- Search-results filter drawer changes.
- Job-card or detail-page visual redesign.
- Volunteer administration or publication workflow.
- Production vacancy population.
- AI integration.

# FURSA Phase 2 — Increment 5: Cross-page Acceptance and Release Guardrails

**Status:** Prepared for GitHub Actions validation and deployment.  
**Depends on:** Increments 1–4 (brand tokens/logo, homepage, search results, and job details).

## Purpose

This increment completes the Phase 2 acceptance layer. It does not introduce a new feature area or change the Django API, database, or Render configuration. It makes the existing branded experience more consistent across routes, improves language switching and mobile navigation behaviour, handles mixed Arabic/Latin content more predictably, and adds automated guardrails to the existing build command.

## Included changes

- Simplifies `app/globals.css` to use the canonical brand tokens instead of retaining a second legacy teal-first palette.
- Adds `app/[locale]/phase2-acceptance.css` for cross-page keyboard focus, mixed-direction content, reduced-motion support, touch behaviour, and responsive filter panel refinements.
- Improves `SiteChrome.tsx`: Escape closes the mobile navigation and returns focus to the menu control; switching language preserves the current path, query string, and hash (important for search filters and job-detail `returnTo` state).
- Renames the footer's link to the safety section to “Safety guidance” rather than implying that a full privacy-policy page exists at that URL.
- Adds a dependency-free static contract check, run automatically before `next build`, covering brand tokens/contrast, homepage reference-data API calls, local flag assets, all eleven category icon keys, the search/filter contract, detail-page source/application safety, responsive styles, and language-switch behaviour.
- Adds a production route smoke test, run automatically after `next build`, by starting the built Next.js server on a free loopback port and checking `/en`, `/ar`, `/en/jobs`, and `/ar/jobs` return HTTP 200 and include the shared FURSA shell and skip-link target.
- Documents the release acceptance checklist and the distinction between automated checks and manual phone-browser review.

## Files included

- `apps/web/app/globals.css` (replaced)
- `apps/web/app/[locale]/components/SiteChrome.tsx` (replaced)
- `apps/web/app/[locale]/layout.tsx` (replaced to load acceptance CSS)
- `apps/web/app/[locale]/phase2-acceptance.css` (new)
- `apps/web/scripts/phase2-contract-check.mjs` (new)
- `apps/web/scripts/phase2-route-smoke.mjs` (new)
- `apps/web/package.json` (scripts updated; dependencies unchanged)
- `docs/PHASE2_INCREMENT5_FINAL_ACCEPTANCE.md` (new)

## Why package scripts changed

The GitHub updater already runs `npm ci`, `npm run typecheck`, and `npm run build`. This increment attaches the static contract test to `prebuild` and attaches a local production-server smoke test to `postbuild`. That way the existing workflow runs these acceptance checks without replacing or editing any GitHub workflow file. No package dependency was added, so the lockfile does not need dependency changes.

## Automated checks

During the existing workflow:

1. `npm ci` installs pinned dependencies from `package-lock.json`.
2. `npm run typecheck` performs TypeScript validation.
3. `npm run build` first executes `prebuild` static contract checks.
4. Next.js builds the production application.
5. `postbuild` launches the production server on loopback and requests the four core routes.
6. The bundle updater only commits if all configured checks succeed.

The contract checks are regression guardrails, not a substitute for a real browser or assistive-technology audit. The route smoke test checks server-rendered response status and common shell elements; it does not fully simulate clicks or validate visual appearance.

## Manual acceptance checklist (must be performed after deployment)

### Brand and homepage
- [ ] Verify the official Royal Blue + Coral Red logo and compact mark display without distortion.
- [ ] Check the homepage search is the primary action at small phone width and desktop width.
- [ ] Verify UAE, Saudi Arabia, Qatar, Kuwait, and Bahrain flags and names are present and clickable.
- [ ] Verify all eleven category icons/labels are consistent and each link carries its intended category slug.
- [ ] Confirm no fake vacancies or fabricated vacancy counts appear.

### Search results
- [ ] Open `/en/jobs` and `/ar/jobs` on a phone.
- [ ] Search for a keyword and confirm the query appears in the URL/results flow.
- [ ] Select a country and test a supported category/work-mode/employment-type filter.
- [ ] Open the mobile filter drawer, use Apply, Clear all, close, and Escape.
- [ ] Confirm focus returns to the Filters button after dismissal.
- [ ] Confirm empty catalogue, no matches, loading, and API error are visually distinct.
- [ ] If a result exists, open its detail view and use Back to return to the same filters/page.

### Job details and external application
- [ ] Open an active vacancy in English and Arabic.
- [ ] Confirm country flag and written country label are both present.
- [ ] Confirm original posting, FURSA publication, last-checked, and deadline dates are not conflated.
- [ ] Confirm missing information is labelled unknown/not specified, not guessed.
- [ ] Confirm the source link is visible and opens in a new tab/window safely.
- [ ] Confirm application buttons use the real destination type and state that the user is leaving FURSA.
- [ ] Confirm invalid or missing application destinations do not render as clickable actions.

### Bilingual and accessibility checks
- [ ] Switch language from a filtered results page; query string and current route are preserved.
- [ ] Switch language from a detail page; `returnTo` state is preserved.
- [ ] Inspect Arabic RTL layout with English employer names, IDs, phone numbers, email addresses, and URLs.
- [ ] Navigate header, filters, cards, and actions with keyboard only.
- [ ] Confirm focus is visible and dialogs/drawers can be dismissed.
- [ ] Test 320–360 px and 390–430 px phone widths with no page-level horizontal overflow.
- [ ] Test reduced-motion preference and at least one screen-reader/accessibility inspection.
- [ ] Confirm coral is not used for ordinary small text on white; use the accessible text token where required.

## Acceptance criteria

Phase 2 should not be marked complete until:

- GitHub Actions is green with the contract check and production route smoke test enabled.
- Render has deployed the resulting application commit.
- English and Arabic home/search routes load on a real phone browser.
- Search filters, language switch, job-detail back navigation, source links, and external application routes have been manually checked with real or controlled test listings.
- No critical visual, RTL, accessibility, or navigation defect remains in the core journey.

## Known limits

- The production catalogue is currently empty according to the verified API response; job-detail interactions that depend on a real public vacancy cannot be fully tested until a reviewed listing exists.
- The automated checks do not claim WCAG conformance. A fuller keyboard, contrast, screen-reader, and visual audit still requires manual testing.
- This increment does not implement volunteer review, reporting backend, job ingestion, or AI assistance; those belong to later roadmap phases.

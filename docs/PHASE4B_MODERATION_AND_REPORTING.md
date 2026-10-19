# FURSA Phase 4B — Vacancy Review and Safety Reporting

## Included

- Contributor-owned vacancy submission drafts stored separately from the public catalogue.
- Draft editing and explicit submission for review.
- Reviewer/admin queue with approve, request-changes, and reject decisions.
- Approval creates the public `Vacancy`, its supporting `Source`, and a source-linked `ApplicationRoute` in one transaction. Publication validates country, region, category, salary ranges, HTTPS source URL, and route scheme/host.
- Contributors cannot review their own submission. Only active reviewers/admins can access review actions.
- Anonymous public safety reports for suspicious, expired, incorrect, broken-link, and other issues; anonymous reporting is throttled at 10 per hour per IP by DRF.
- Reports do not automatically delist a vacancy. Reviewers can investigate, resolve, dismiss, or suspend with a required reason.
- Audit events for submission lifecycle changes, review decisions, report creation, and report decisions.
- Bilingual English/Arabic frontend routes for contributor submissions, review queue, reports, and public reporting.

## Routes

- `GET|POST /api/v1/moderation/submissions/`
- `GET|PATCH /api/v1/moderation/submissions/<uuid>/`
- `POST /api/v1/moderation/submissions/<uuid>/submit/`
- `GET /api/v1/moderation/review-queue/`
- `POST /api/v1/moderation/review-queue/<uuid>/decision/` with `decision=approve|request_changes|reject` and `note`
- `POST /api/v1/moderation/reports/` (public; `vacancy_id`, `reason`, optional `details`)
- `GET /api/v1/moderation/reports/` (reviewer/admin only)
- `POST /api/v1/moderation/reports/<id>/decision/` with `decision=investigate|resolve|dismiss|suspend` and `note`

## Frontend routes

- `/{locale}/volunteer/submissions`
- `/{locale}/volunteer/review`
- `/{locale}/volunteer/reports`
- `/{locale}/report-job?vacancy=<uuid>`

The volunteer dashboard links to the three workflow pages. The vacancy detail page links to the public report form.

## Submission payload

The submissions endpoint accepts a `data` object containing supported `Vacancy` fields and:

- `country_code` (enabled country code)
- optional `region_id` and `category_id`
- `source_name`, `source_url` (HTTPS), `source_type`, `source_permission_note`
- `route_type` and `route_destination` (HTTPS website, `mailto:` email, or approved HTTPS WhatsApp route)

The contributor interface currently exposes the structured JSON editor so the underlying field contract is explicit during this foundation stage. A guided form can replace it in a later UX pass without changing the API.

## Apply and verify

1. Upload this ZIP to the repository root and commit it.
2. GitHub Actions `Apply Any FURSA ZIP` validates the API, migration consistency, tests, frontend typecheck, and build before committing extracted files.
3. Verify `python manage.py migrate`, `python manage.py test moderation`, and the full frontend build in CI.
4. After deployment, verify the anonymous report flow and each volunteer role using test records only. Do not seed fake vacancies into production.

## Boundaries

This stage does not implement automatic expiry or reviewer/admin MFA; those remain Phase 4C. Production rollout must still verify CORS/CSRF origins and the existing session configuration. Report creation is rate-limited but still requires monitoring for abuse. Reviewers must actually verify the source and application destination before approving a submission.

# FURSA Phase 4 — Revised Admin Workspace

## Product decisions implemented

- There is one volunteer account type: Admin. A data migration normalizes existing volunteer roles to `ADMIN`.
- Every active, approved volunteer can create, edit, publish, close, and suspend source-backed vacancies.
- The founder alone can create/revoke invitations, manage admin access, and issue manual password setup/reset links.
- There is no public admin registration endpoint and no MFA.
- Both email/password login and Google sign-in use the existing authentication foundation.
- Invitations are created with the `ADMIN` role, expire after 24 hours, are single-use, and are shared manually by WhatsApp/email. No temporary passwords are sent.
- A volunteer creates their own password through the invitation link, or accepts the invitation with the invited Google identity.
- The dashboard has a guided job form, admin job list, public reports, founder-only invitation/team controls, and manual password reset-link creation.
- Job publication requires a valid enabled country, job title, employer, description, HTTPS source, application destination, and explicit confirmation that the application destination was checked. Salary and closing date remain optional if the employer did not state them.
- Job changes, invitations, account access changes, and automatic expiry are audited.
- `expire_vacancies` marks published vacancies with an elapsed `expires_at` as expired. It must be scheduled by an operator when the team is ready; the command does not create a paid scheduler by itself.
- No sample vacancies are seeded.

## Founder bootstrap and production configuration

1. In the Render API service's controlled shell, create/confirm the founder's Django superuser if one does not already exist:

   ```bash
   python apps/api/manage.py createsuperuser
   ```

2. Grant that existing account a volunteer-admin profile:

   ```bash
   python apps/api/manage.py grant_volunteer_admin --email YOUR_FOUNDER_EMAIL
   ```

3. Set `FURSA_FOUNDER_EMAIL` on the Render API service to the exact verified email for the founder account. This is required for founder-only controls; if unset, founder access fails closed.
4. Set `GOOGLE_OAUTH_CLIENT_ID` on the API and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on the frontend to the same Google OAuth Web client ID. Configure the authorized origins/redirects for the deployed frontend according to Google's current OAuth setup.
5. Ensure the Render API start command runs migrations before Gunicorn, as documented in the root README. Migration `volunteers.0002_normalize_volunteer_roles` consolidates existing profiles to `ADMIN`.
6. Keep email sending disabled during $0 development. Founder-generated invitation/reset links can be copied and shared privately by WhatsApp or email. Invitation and reset links are secrets: send them only to the intended volunteer and revoke access promptly if a link is exposed.
7. Once ready to automate expiry, schedule `python apps/api/manage.py expire_vacancies` with an existing scheduler/cron capability; confirm its cost and cadence before enabling any paid service.

## API additions

- `GET/POST /api/v1/moderation/jobs/`
- `GET/PATCH /api/v1/moderation/jobs/<uuid>/`
- `POST /api/v1/moderation/jobs/<uuid>/status/`
- Founder-only overrides under `/api/v1/volunteer/` for dashboard capabilities, invitations, team management, and manual password reset links.

## Validation and limitations

The ZIP updater's GitHub Actions workflow should run Django checks/tests, migration checks, frontend typecheck, and production build before committing the bundle. Local syntax checks are not a substitute for those CI checks. Verify the deployment after CI succeeds, including a real invitation, both sign-in methods, a draft, a published vacancy, public search/detail visibility, reports, account revocation, and a reset-link flow.

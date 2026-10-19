# FURSA Phase 4A — Authentication and Volunteer Access

## Included in this foundation

- Custom bilingual volunteer sign-in and dashboard routes under `/en/volunteer/...` and `/ar/volunteer/...`.
- Email/password sign-in for active volunteer accounts.
- A development-only password-reset request/confirmation flow using Django’s signed reset tokens; production email recovery remains disabled until a verified sender is configured.
- Invitation-only account activation.
- Google Identity Services ID-token verification on the API when a Google OAuth client ID is configured.
- Single primary role per volunteer: `CONTRIBUTOR`, `REVIEWER`, or `ADMIN`.
- Active, suspended, and revoked volunteer account states.
- Hashed, expiring, single-use invitation tokens.
- Admin-only invitation creation/listing and pending-invitation revocation.
- Append-only audit events for sign-in, invitation, and bootstrap actions.
- Session cookies with a browser-close default and an explicit “keep me signed in” option, CSRF bootstrap, and restricted credentialed CORS for volunteer API routes.

## Local setup

From `apps/api`:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py grant_volunteer_admin --email your-superuser-email@example.com
python manage.py test volunteers
```

Use an email address matching the Django superuser you created. The management command refuses to grant the volunteer admin role to a non-superuser. This is the safe bootstrap path; there is no public endpoint for assigning an admin role.

Run the website from `apps/web` with `npm install` and `npm run dev`. Copy `.env.example` to the repository-root `.env` for local development. The existing public website does not require volunteer sign-in.

## Google sign-in configuration

Google sign-in remains visibly unavailable until a Google OAuth Web client ID is configured. To enable it, configure the **same** client ID in both:

- API environment: `GOOGLE_OAUTH_CLIENT_ID`
- Frontend build environment: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Configure the allowed JavaScript origins for the local web origin and the deployed FURSA web origin in the Google OAuth client. The API verifies the Google ID token's signature, audience, and verified-email claim. A verified Google identity still receives volunteer access only when it matches an active account or a valid invitation.

Do not commit OAuth credentials or service secrets. After changing a `NEXT_PUBLIC_` variable, rebuild/redeploy the frontend so the value is included in the client bundle.

## Invitation delivery status

Production invitation creation intentionally fails closed until real email delivery is configured. In local development (`DEBUG=true`), an admin can create a development invitation and the API returns a test link. The API never returns raw invitation tokens in production responses. Do not share development invitation links or enable debug mode in production.

Real production invitations, password-recovery email delivery, and any email verification that depends on a delivered message are not yet enabled by this foundation. Configure and test a verified sender before allowing production invitations.

## API routes

- `GET /api/v1/volunteer/csrf/` — CSRF bootstrap token.
- `POST /api/v1/volunteer/auth/login/` — email/password sign-in; active volunteer profile required.
- `POST /api/v1/volunteer/auth/google/` — Google ID-token sign-in; Google client ID required.
- `POST /api/v1/volunteer/auth/password-reset/request/` — development reset link only while `DEBUG=true`; production returns a clear not-configured response.
- `POST /api/v1/volunteer/auth/password-reset/confirm/` — validates the signed reset token and changes the password.
- `POST /api/v1/volunteer/auth/accept-invitation/` — accept an unexpired invitation with a password.
- `POST /api/v1/volunteer/auth/logout/` — sign out.
- `GET /api/v1/volunteer/me/` — current active volunteer.
- `GET /api/v1/volunteer/dashboard/` — role and capability summary.
- `GET|POST /api/v1/volunteer/invitations/` — admin-only invitation list/create (creation is development-only until delivery exists).
- `POST /api/v1/volunteer/invitations/<id>/revoke/` — admin-only pending invitation revocation.
- `GET /api/v1/volunteer/team/` — admin-only volunteer roster.
- `POST /api/v1/volunteer/team/<id>/update/` — admin-only role/status update, with self-change and last-admin protections.

## Security notes and Phase 4A boundaries

- The frontend does not grant roles; the API checks volunteer status and role for protected actions.
- The first volunteer administrator is bootstrapped from an existing Django superuser using `grant_volunteer_admin`; no public route can create an administrator.
- The administrator dashboard supports invitations, invitation revocation, and role/status updates for existing volunteer accounts.
- Session cookies are HTTP-only. Cross-origin volunteer requests use CSRF tokens and credentials; CORS remains limited to configured origins.
- Invitation tokens are stored as SHA-256 hashes, expire after 72 hours, and can be accepted once.
- Audit events reject model saves, instance deletes, and queryset bulk updates/deletes. Database administrators can still alter database contents, so production database access must remain restricted.
- This stage establishes authentication and dashboard scaffolding. Vacancy drafting/review, public safety reports, reviewer/admin MFA, and automatic expiry remain later Phase 4 work and are not represented as complete.

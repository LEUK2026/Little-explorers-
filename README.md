# Little Explorers — complete fresh VS Code project

**Childminding in Livingston, Scotland.** A security-focused Next.js/Supabase starting system with public website, private parents and admin portal, attendance-based invoices, photos, incident reports, Direct Debit integration, Christmas activities and an independent watchdog.

> **Before launch:** This is a working source-code implementation, not a certified production system. It requires your own Supabase/GoCardless/Resend/Cloudflare/Vercel configuration and real integration/security tests. No software can be guaranteed to have zero vulnerabilities. The childcare owner must approve the actual fees, policies, consent forms and retention rules.

## 1. Open in Visual Studio Code

1. Unzip the archive.
2. In VS Code, choose **File → Open Folder → `little-explorers`**.
3. Install Node.js 22 or later.
4. Open a VS Code terminal and run `npm ci`.
5. Copy `.env.example` to `.env.local` and replace the placeholders with your OWN credentials.
6. Run `npm run dev` and open http://localhost:3000.

The public homepage and Christmas page have no database dependency. Parent and admin features require Supabase setup first.

## 2. Add your logos

- Main logo: replace `public/branding/logo.svg`.
- Browser favicon: replace `src/app/icon.svg`.
- If your main logo is a PNG rather than an SVG, save it as `public/branding/logo.png` and change `/branding/logo.svg` to `/branding/logo.png` in `src/components/SiteHeader.tsx`.
- Site colour palette: `src/app/globals.css` (top of file).
- Site copy: `src/app/page.tsx`, `src/app/policies/page.tsx`.

**Do not upload real children's pictures into the repository.** Those must go into private Supabase Storage through the approved admin portal.

## 3. Set up Supabase — brand new project

1. Create a NEW Supabase project. Do not run the master SQL in your previous production database; this is a clean replacement schema.
2. Open **SQL Editor** and run `supabase/001_master.sql` from top to bottom **once**.
3. In **Authentication → Providers → Email**, enable email sign-in and **email confirmation**. Configure a real production SMTP sender for auth emails before launch.
4. Add `http://localhost:3000/auth/callback` to Supabase's auth redirect allow list. Add your real HTTPS app URL when live.
5. In **Settings → API**, put the Supabase URL and **publishable** key into `.env.local`.
6. Put the **service-role key** into `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` **only**. Never prefix this with `NEXT_PUBLIC_` or commit the secret.
7. In **Supabase Authentication → Users**, add the administrator's real email account and confirm the email if required. The SQL trigger creates its profile. Do not create a fake childcare enquiry just to create an admin account.
8. In Supabase Authentication, copy that user's UUID; run this in SQL Editor with the REAL UUID:

   ```sql
   update public.profiles
   set role = 'admin', approved = true
   where id = 'PASTE-EXACT-SUPABASE-AUTH-USER-UUID';
   ```

9. Sign in at `/admin/login`. You must register a TOTP authenticator app at `/admin/setup-mfa` before opening admin records.
10. New family registrations create **pending enquiries**. Admin approves them in `/admin/parents`, which creates a child record. Parents complete onboarding after approval.

**Critical security note:** A Supabase service-role key was shared in an earlier conversation. If it has not been **rotated/revoked**, do that in Supabase before connecting this project. Never copy the old exposed key into this folder.

### Why RLS matters

The master SQL enables row-level security on every child/family table. A parent may view only their family's records and may write only their own onboarding/incident acknowledgement. Administrators must pass **MFA (AAL2)** in addition to having `role='admin'`. Server-side actions verify the admin role again before using the service-role key. Permissions are not enforced by hiding web buttons.

## 4. Parent portal

Parents use `/login` and `/portal` to view:

| Area | Function |
|---|---|
| `/portal/onboarding` | Date of birth, emergency contact, medical notes, sunscreen, outings, photo consent, additional support needs, development, sleeping, feeding; six-month review date |
| `/portal/attendance` | Recorded times/hours and cost estimates |
| `/portal/incidents` | Read and acknowledge private incident reports |
| `/portal/photos` | Consent-checked, privately signed photo links |
| `/portal/invoices` | Issued invoices, PDF downloads, Direct Debit mandate and optional bank transfer details |

Hourly rates are set by Nicole in the admin portal. Parents **cannot set or alter their own hourly rate**. Attendance records snapshot the rate at the time the session is entered.

## 5. Admin portal

Start at `/admin/login`, then:

- **Parents:** review enquiries, approve accounts, add siblings, set hourly rates, retry approval emails.
- **Onboarding:** securely review children's submitted needs, routines and permissions.
- **Attendance:** enter date, check-in/out, notes; billing uses the recorded duration and rate. Overlapping attendance for one child is rejected in SQL.
- **Incident reports:** write factual records and actions taken. Parents can acknowledge them.
- **Photos:** privately upload images (JPG/PNG/WebP, **max 3 MB** for Vercel request limits). Images are decoded, resized and converted to JPEG to remove EXIF/location metadata. Individual-child consent is required. Never upload group images unless every applicable consent and access decision has been checked separately.
- **Invoices:** create monthly drafts, refresh drafts after correcting attendance, issue invoices and email them, request GoCardless collection, or record a verified bank transfer.

## 6. Automated invoices

Each calendar month, the system can create one draft per family from attendance:

`cost (in pence) = round(minutes × recorded hourly-rate pence ÷ 60)`

The invoice includes itemised attendance and can be downloaded as PDF. Repeated draft generation is designed to avoid duplicates. PDF access checks family ownership or administrator role+MFA.

**Automatic schedule:** After testing, run `supabase/002_optional_monthly_schedule.sql` in Supabase SQL Editor. That sets up a **single** monthly database cron for both Vercel production websites. It generates drafts, not payments. Don't configure a second Vercel cron on top of it.

**Optional alternative:** An external scheduler may call `GET /api/cron/invoices` with `Authorization: Bearer <CRON_SECRET>` on the first of the month. Set `INVOICE_AUTO_ISSUE=false` for the recommended reviewed workflow. Do **not** run both scheduling methods.

**Before enabling automatic issue or real Direct Debit:** Confirm how Little Explorers handles funded hours, discounts, cancelled sessions, closures, late collection, credit notes, partial payments and payment notifications. The included straightforward biller covers recorded hourly attendance, not all exceptional fee policies. Verify the exact amount with Nicole and test in sandbox first.

## 7. Resend: parent approval and invoice emails

1. Verify an email-sending domain in your Resend dashboard.
2. Add `RESEND_API_KEY` and `RESEND_FROM` to `.env.local` and later Vercel's server-only environment settings.
3. A parent account approval sends a welcome email; the admin page shows an unsent status and provides retry if Resend fails.
4. Issuing an invoice sends a notice that the PDF is waiting in the **private** portal. Medical and incident details are never included in the email body.

## 8. GoCardless: sandbox first

1. Get a GoCardless **sandbox** token with the permissions necessary to create redirect flows, mandates and payments. Configure `GOCARDLESS_ENV=sandbox`.
2. Supply `GOCARDLESS_ACCESS_TOKEN` and `GOCARDLESS_WEBHOOK_SECRET` as **server-only** secrets.
3. Configure the GoCardless webhook endpoint at `https://YOUR_DOMAIN/api/webhooks/gocardless`.
4. A parent chooses **Set up Direct Debit**. The hosted GoCardless page creates a mandate; the website stores only the mandate ID, never bank credentials.
5. An authorised administrator may initiate a **variable-amount one-off Direct Debit** against a specific issued invoice. The `Idempotency-Key` avoids duplicate API payments on retries.
6. Signed webhooks verify the raw HMAC-SHA256 signature and fetch current payment status. Duplicated webhook IDs are tracked.
7. Keep `ALLOW_LIVE_COLLECTIONS=false` until you've completed live onboarding, approval and scheme advance-notice testing. **Do not collect real money until authorised.**

**Bank transfer:** The owner's name, sort code, account number and reference are only shown to an approved logged-in parent when all bank env fields are provided. The owner must confirm receipt of transfers before marking an invoice as paid.

## 9. Christmas experience

`/christmas` has a 24-day advent calendar with daily unlocks based on the Europe/London date, child-friendly ideas and a festive page. It is public and doesn't show any child data. More festive graphics or activities can be added inside `src/app/christmas/page.tsx`.

## 10. GitHub → Vercel (two-production strategy)

**Important:** The ZIP contains the project and configuration instructions. It cannot create your Vercel projects, GitHub repo, DNS or load balancer without access to your accounts.

1. Create a **private GitHub repository** and push the project **without `.env.local`**. Check `.gitignore` and enable GitHub secret scanning / repository security protections.
2. Protect `main` and `stable` branches with pull requests, checks and approvals. CI lives in `.github/workflows/ci.yml` and runs build/tests/audit on both.
3. Add a Vercel project **Little Explorers A** from `main`, and a separate Vercel project **Little Explorers B** from `stable` (a known-good release). Disable automatic production updates to B from `main`.
4. Give both projects their **correct production env values**, but remember they are both connected to the **same production Supabase**, so schema migrations must work with both app versions.
5. Create a **third staging Vercel project** and **separate staging Supabase project** for testing with dummy families. Never use real children in testing.
6. Put a **Cloudflare Load Balancer** in front of the public domain, with A as preferred primary and B as standby, with appropriate health monitors checking `/api/health`.
7. Configure and test **unique origin hostnames, TLS certificates, Host headers and Supabase login/cookie behaviour** for both Vercel projects. Vercel assigns a custom production domain to one project, so a load balancer needs an origin/domain design verified for your chosen plans. This is not automatic simply from connecting two Vercel projects.
8. Release to A, verify real page flows and database compatibility, keep B on the last healthy tag. Deliberately break A in staging and confirm Cloudflare sends users to B. Verify return-to-primary carefully.
9. Keep **exactly one invoice scheduler** (Supabase database cron), so both websites do not bill the same family twice.

Parents may need to retry an in-progress form submission if failover happens mid-request; test login sessions, CSRF behaviour, direct-debit redirects and PDF/photo links across both origins.

**Limits:** A/B protects against some app-level releases and Vercel project faults, not a shared Supabase/database outage or a bad database migration. Backups, monitoring and incident drills are still needed. Cloudflare Load Balancing may add paid service costs.

## 11. Independent watchdog + status page

The standalone Cloudflare Worker code is in `watchdog/` and has its own D1 SQL database. It runs separately from both Vercel websites and Supabase.

1. Create a Cloudflare D1 database for service status using Cloudflare Workers / Wrangler.
2. Put its real D1 `database_id` in `watchdog/wrangler.toml` (this ID is not a secret).
3. Execute `watchdog/d1.sql` against that D1 database.
4. Configure Worker **secrets**: `SITE_A_URL`, `SITE_B_URL`, `HEALTH_CHECK_SECRET`. `SITE_A_URL` and B must be the two **real Vercel origin addresses** (HTTPS), not the single public load-balanced address.
5. Set the same `HEALTH_CHECK_SECRET` on the Vercel A/B deployments. The private `/api/health/internal` endpoint checks database reachability, the invoice-job heartbeat, and limited external API availability.
6. Optionally add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as Worker secrets for outage/recovery alerts.
7. Deploy the Worker separately and map `status.YOUR_DOMAIN` to it. No child's private information is written to D1 or exposed on the status page.
8. Set `NEXT_PUBLIC_STATUS_PAGE_URL=https://status.YOUR_DOMAIN` on both Vercel projects to show a **Service status** link in the website footer.

The Worker checks about every five minutes, records state/history, requires two consecutive failures to mark a service down, and shows a simple public dashboard. Separately configure Cloudflare Load Balancing's **own** health monitor for actual traffic failover. The watchdog is for visibility/alerts; it is not itself the load balancer.

## 12. Before handling real children's data or money

**Required owner checks:**

- Replace placeholder policy summaries with Nicole's approved Scottish childcare policies, privacy notice, parental consents and complaints procedure.
- Confirm Care Inspectorate / local authority requirements applicable to the business, and UK data protection duties (lawful bases, retention schedules, breach handling and subject access).
- Agree precise childcare fee rules and review every invoicing edge case with test invoices.
- Enable robust Supabase authentication settings, abuse protection/CAPTCHA where appropriate and MFA for all staff; apply WAF and route rate limits at the edge.
- Check per-child photo permission, including any other children visible in the background. Agree image retention, deletion and parent access policies.
- Test a parent trying to access another family's data; verify database RLS and storage isolation separately from UI tests.
- Rotate exposed keys, use secret managers, enable alerts, backups, restore drills and audit-log review.
- Complete GoCardless sandbox simulations for success, rejected mandates, duplicate payments, failures and out-of-order webhooks before enabling real collection.
- Conduct independent security review / penetration testing before a live launch.

## 13. Local checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Dependencies are managed in `package-lock.json`. GitHub Dependabot opens weekly update PRs. The audit result is only a point-in-time check; advisories and security risks can change.

## 14. Known boundaries and future work

- Fee policies such as funded hours, sickness days, absence charges, credit notes and partial payments need business-specific rules **before full billing automation**.
- This implementation does not automatically retry failed Direct Debit payments; an administrator must reconcile with GoCardless, preventing an accidental double collection.
- Photo consent is individual-child consent; group photos and parent-to-parent sharing require a more detailed consent/access model before enabling.
- Vercel/Cloudflare A/B health failover, domain certificates, user sessions and payment webhooks need integration tests in your actual hosting accounts.
- Basic admin/parent screens and unit tests are included; live end-to-end browser tests and an external security audit are still necessary.

**Please don't use real parent data until every applicable launch check is complete.**

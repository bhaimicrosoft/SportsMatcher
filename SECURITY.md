# SportsMatcher — Phase 0 Security Hardening

This document tracks the manual steps that have to be performed in external
consoles (Firebase, Google Cloud, reCAPTCHA, Sentry, Apple, Google Play) to
make the Phase 0 code changes effective. Code without these console settings
is not secure.

The order matters — do them top to bottom.

---

## 1. Install the new client dependency

```bash
npm install
```

`@sentry/angular` was added to `package.json` for client error monitoring.

---

## 2. Deploy Firestore rules and indexes

The repo now has `firestore.rules`, `firestore.indexes.json`, and `firebase.json`.
Until you deploy them, Firestore is still running whatever rules existed
before — likely "test mode" (open) or expired (closed). Either is wrong.

```bash
# One-time:
npm install -g firebase-tools
firebase login
firebase use sportsmatcher-6ccf7

# Deploy:
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

The composite index for booking conflict-checks (`userId + venuePlaceId +
startsAt`) takes a few minutes to build. The booking flow will fail with
"requires an index" until it's `READY` — visible in
**Firebase Console > Firestore > Indexes**.

### Verify rules
- Open the **Rules Playground** (Firebase Console > Firestore > Rules > Rules
  Playground).
- Try a `get` on `bookings/foo` while signed out — must be **denied**.
- Try a `create` on `bookings/foo` with `email_verified: false` — must be
  **denied**.
- Try a `create` with the right schema and a verified user — must be
  **allowed**.

---

## 3. Enable App Check

The client now sends App Check tokens with every Firebase request. Until you
**enable enforcement** in the Firebase Console, those tokens are validated
but their absence isn't blocking — meaning script-kiddie traffic against
the public Firebase config still gets through.

### 3a. Create a reCAPTCHA v3 site key
1. Go to <https://www.google.com/recaptcha/admin>.
2. Create a v3 key. Domains: `localhost`, your production web origin (e.g.,
   `app.sportsmatcher.com`).
3. Copy the **site key** (the public one, NOT the secret key) into
   `src/environments/environment.ts` and `environment.prod.ts` under
   `appCheck.recaptchaSiteKey`.

### 3b. Register the site in Firebase
1. Firebase Console > **App Check** > Apps > Web app.
2. Provider: **reCAPTCHA v3**, paste the same site key.
3. TTL: 1 hour (default).

### 3c. Register a debug token for local development
1. Run the app once with `npm start`.
2. In the browser console, find the line: `App Check debug token: <UUID>`.
3. Firebase Console > App Check > Apps > Web app > **Manage debug tokens** >
   add the UUID. Name it after your dev machine.

### 3d. Enable enforcement
**Do this only after the production app is live with App Check working** —
otherwise legit production traffic gets rejected.

Firebase Console > App Check > APIs:
- **Cloud Firestore** > Enforce
- **Authentication** > Enforce (Phase 1+, once Cloud Functions exist)

### 3e. Native (iOS / Android) — Phase 0.5
The current setup uses reCAPTCHA in the WebView, which works but is weaker
than native attestation. Switch to App Attest (iOS) and Play Integrity
(Android) when you have native build infrastructure ready. Tracked as a
Phase 0.5 follow-up.

---

## 4. Restrict the Google Maps API key

The Maps key in `environment.ts` is currently unrestricted. Anyone who
inspects your built JS bundle (it's public!) can use the key against your
billing account until you restrict it.

Google Cloud Console > **APIs & Services** > Credentials > [your Maps key]:

### Application restrictions
- **HTTP referrers**: add `localhost`, `127.0.0.1`, your production web
  origin (e.g., `https://app.sportsmatcher.com/*`).
- For Capacitor native, the WebView origin is `capacitor://localhost` (iOS)
  and `https://localhost` (Android). Both should be allowlisted, or use a
  separate Android/iOS-keyed key (preferred — see below).

### API restrictions
- **Restrict key** to: Maps JavaScript API, Places API (New), Geocoding API.
  Nothing else.

### Two-key strategy (recommended)
Create a second key restricted to **Android apps** by SHA-1 fingerprint and
package name; use it only in the Capacitor Android build. Repeat for iOS
(bundle ID restriction). The web key never leaves the web bundle.

### Quotas
Set daily quotas on each key (e.g., Places API = 10k requests/day) so a
runaway script can't ring up a five-figure bill. Cloud Console > **APIs &
Services** > [API] > Quotas.

---

## 5. Email verification

The sign-up flow now sends a verification email automatically and Firestore
rules require `email_verified: true` for booking writes.

### 5a. Customize the verification email
Firebase Console > **Authentication** > Templates > Email address verification:
- From name: SportsMatcher
- Subject: "Verify your SportsMatcher account"
- Action URL: leave default unless you set up a custom domain.

### 5b. Set up a custom action handler (recommended for production)
The default Firebase action URL routes through `<project>.firebaseapp.com`,
which looks like phishing to many email clients. Set up a custom auth
domain (Firebase Console > Authentication > Settings > Authorized domains)
and host the action handler under your own domain. Tracked as Phase 0.5.

### 5c. Email enumeration protection
Firebase Console > Authentication > Settings > **User actions**:
- Enable **Email enumeration protection**. This prevents attackers from
  using the password reset / sign-in endpoints to discover whether an
  email is registered.

---

## 6. Sentry error monitoring

Client error reporting is wired up but inert until you provide a DSN.

1. Create a Sentry project (Angular). Free tier is fine for v1.
2. Copy the DSN from **Project Settings > Client Keys (DSN)**.
3. Inject it into your production build at CI time. Locally, leave the dev
   DSN empty so Sentry stays off and doesn't pollute your dashboard.

PII (emails, IPs, request bodies) is OFF by default in `main.ts`. Don't
turn it on without a documented reason — most security incidents involve
logs that should never have been collected in the first place.

---

## 7. Authentication tightening

Firebase Console > Authentication > Settings:

- **Enable email enumeration protection** (item 5c).
- **Multi-factor authentication**: enable for all users now (Auth >
  Sign-in method > Multi-factor authentication > Enable). Players can
  opt-in via their profile (Phase 1 UI). Providers will be **required**
  to enable MFA in Phase 1.
- **SMS region policy**: restrict to **United States** only (we launch
  US-only). This prevents SMS-toll-fraud bot abuse via international
  premium numbers — a routine attack against unrestricted Firebase Auth.
- **Authorized domains**: remove any test domains. Keep only `localhost`
  and your production domain.

---

## 8. Operational

- **Daily Firestore backups**: Firebase Console > Firestore > **Backups** >
  enable a daily schedule with 7-day retention. ~$0.026 / GB / month.
- **Budget alerts**: Cloud Console > Billing > Budgets & alerts. Set a
  monthly budget with email alerts at 50%, 90%, 100%. A misconfigured
  Maps key has burned six-figure bills before.
- **App Check usage dashboard**: Firebase Console > App Check > Usage.
  Watch for spikes of `verified: false` traffic — that's a probe.

---

## 9. What is NOT yet hardened

The following are intentionally deferred to later phases. None of them
weaken Phase 0 — but you should know they're outstanding.

- **Cross-user booking conflict detection.** With the new owner-only read
  rules, the client-side conflict check only sees the user's own bookings.
  True venue-capacity enforcement requires a Cloud Function (Phase 2).
- **Account deletion / GDPR-CCPA export.** Firestore rules disallow
  client-side delete. The deletion flow is a Cloud Function in Phase 1.
- **Rate limiting.** Firestore rules can't easily limit per-user write
  rates. Cloud Functions + Firestore counter docs (or Cloud Armor on the
  function URL) — Phase 1.
- **Native attestation** (App Attest / Play Integrity) — Phase 0.5.
- **Provider role + Stripe Connect KYC** — Phase 1 / Phase 3.
- **Audit logs** for sensitive admin actions — Phase 5.

---

## Phase 0 acceptance checklist

Tick these off as you finish:

- [ ] `npm install` ran cleanly
- [ ] `firebase deploy --only firestore:rules` succeeded
- [ ] `firebase deploy --only firestore:indexes` succeeded; index is `READY`
- [ ] reCAPTCHA v3 site key created and pasted into both environment files
- [ ] Web app registered in Firebase App Check
- [ ] Debug token added to App Check for local dev
- [ ] App Check enforcement enabled for **Firestore** in production
- [ ] Maps API key has HTTP-referrer and API restrictions applied
- [ ] Maps API daily quota set
- [ ] Email enumeration protection enabled
- [ ] SMS region policy restricted to US
- [ ] Sentry DSN configured for production build
- [ ] Daily Firestore backup schedule active
- [ ] Billing budget alert configured

Once all boxes are ticked, Phase 0 is complete and we're ready to start
Phase 1 (Cloud Functions + provider role).

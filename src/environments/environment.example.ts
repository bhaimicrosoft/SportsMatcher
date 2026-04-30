// Template for environment.ts and environment.prod.ts.
//
// 1. Copy this file to:
//      - src/environments/environment.ts       (development)
//      - src/environments/environment.prod.ts  (production; set production: true)
// 2. Fill in your Firebase web SDK config and Google Maps API key.
// 3. The real environment files are gitignored so you cannot commit secrets
//    by accident — keep it that way. For production, prefer injecting these
//    at CI build time from a secret store.
//
// See README.md for how to obtain each value.

export const environment = {
  production: false,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID'
  },
  googleMaps: {
    // Browser/web key — restrict to your domain in Google Cloud Console.
    apiKey: 'YOUR_GOOGLE_MAPS_BROWSER_KEY'
  },
  appCheck: {
    // reCAPTCHA v3 site key. Register the matching key under
    // Firebase Console > App Check > Apps > Web.
    recaptchaSiteKey: 'YOUR_RECAPTCHA_V3_SITE_KEY'
  },
  sentry: {
    // Sentry DSN. Leave empty to disable error reporting in dev.
    dsn: ''
  }
};

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Enable App Check debug tokens in development. The Firebase SDK will print
// a debug token in the console on first init — register it in Firebase
// Console > App Check > Apps > Manage debug tokens. Production builds skip
// this so real reCAPTCHA enforcement applies.
if (!environment.production) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Initialise Sentry only when a DSN is configured. PII (emails, IPs, request
// bodies) is OFF by default; opt in per-event via `setUser` if needed for a
// specific debug session.
if (environment.sentry?.dsn) {
  Sentry.init({
    dsn: environment.sentry.dsn,
    environment: environment.production ? 'production' : 'development',
    tracesSampleRate: environment.production ? 0.1 : 1.0,
    sendDefaultPii: false
  });
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));

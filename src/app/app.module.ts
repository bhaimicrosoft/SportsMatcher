import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import {
  provideAppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider
} from '@angular/fire/app-check';
import * as Sentry from '@sentry/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot({ mode: 'ios' }), AppRoutingModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      // Sentry's wrapper forwards uncaught Angular errors to Sentry. When
      // no DSN is configured (dev default), Sentry.init was skipped and the
      // handler degrades to a no-op + console.error.
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({ showDialog: false })
    },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAppCheck(() =>
      // App Check attaches a token to every Firestore / Auth / Functions
      // request. Firebase rejects requests without a valid token once
      // enforcement is enabled in the Firebase Console. This is the primary
      // defence against abuse from random scripts using the public Firebase
      // config — Firestore rules alone don't stop quota burn or scraping.
      initializeAppCheck(undefined, {
        provider: new ReCaptchaV3Provider(environment.appCheck.recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

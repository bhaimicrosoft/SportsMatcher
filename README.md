# SportsMatcher

Find and book nearby playgrounds for pickleball, tennis, badminton and basketball.

Built with Ionic + Angular + Capacitor, Firebase (Auth + Firestore), Google Maps + Places API, biometric sign-in, and Tailwind CSS v4.

## Stack

- **Ionic 8** + **Angular 20** (NgModule-based, mode `ios` for a polished feel on both platforms)
- **Capacitor 8** for native iOS / Android builds
- **Firebase** (`@angular/fire`) — email/password auth + Firestore for user profiles, bookings, favorites
- **Google Maps JS SDK** with Places library — nearby search and map view
- **`@aparajita/capacitor-biometric-auth`** — FaceID / TouchID / Android biometric
- **Tailwind CSS v4** with a custom brand theme

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure secrets

Copy the template into the real env files (these are gitignored, so your keys stay local):

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.prod.ts
```

Then edit both files with:

- A **Firebase web config** (Firebase Console → Project Settings → Your apps → Web app → SDK config). In `environment.prod.ts`, set `production: true`.
- A **Google Maps API key** with the **Maps JavaScript API** and **Places API** enabled. Restrict it to your domain / app bundle in Google Cloud Console.

> The real `environment.ts` / `environment.prod.ts` are gitignored. For production, inject these at CI build time from a secret store.

In Firebase Console:
- Enable **Authentication → Sign-in method → Email/Password**.
- Create a **Firestore database** (start in production mode, add rules below).

Suggested Firestore rules:

```ruby
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /bookings/{id} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

### 3. Run in the browser

```bash
npm start
# or: ionic serve
```

Open http://localhost:4200. Geolocation will use the browser's Geolocation API; biometrics are no-op on web.

### 4. Build for production

```bash
npm run build
```

Output goes to `www/`.

## Native (iOS + Android)

Capacitor wraps the web build into native iOS/Android projects.

### Add platforms (one-time)

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

This creates `ios/` and `android/` folders.

### Configure Google Maps native keys

The `@capacitor/google-maps` plugin needs a key per platform.

**iOS** — in `ios/App/App/AppDelegate.swift`, you don't need to add a key globally; the plugin reads it from the JS side. But for the Maps JS SDK to load inside the WKWebView, the key in `environment.ts` must allow your iOS bundle ID. Configure in Google Cloud Console → Credentials → restrict the key by iOS app.

**Android** — add to `android/app/src/main/AndroidManifest.xml` inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_GOOGLE_MAPS_ANDROID_KEY"/>
```

### Permissions

The biometric, geolocation, and share plugins need standard permissions; Capacitor scaffolds them on first sync. If you customize, see:

- iOS `Info.plist` keys: `NSLocationWhenInUseUsageDescription`, `NSFaceIDUsageDescription`.
- Android: `ACCESS_FINE_LOCATION`, `USE_BIOMETRIC` are added automatically by the plugins.

### Run on device

```bash
npm run build && npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

Build and run from the IDE.

### Live reload (dev)

```bash
ionic cap run ios -l --external
ionic cap run android -l --external
```

### App icon + splash screen

The brand source is checked in as SVG at [resources/icon.svg](resources/icon.svg) and [resources/splash.svg](resources/splash.svg). Edit those, then run:

```bash
npm run assets
```

That script does two things:

1. Rasterizes the SVGs to the PNG sources `@capacitor/assets` expects (`assets/icon-only.png`, `assets/icon-foreground.png`, `assets/icon-background.png`, `assets/splash.png`, `assets/splash-dark.png`).
2. Invokes `capacitor-assets generate`, which writes every required iOS app-icon size + LaunchScreen.storyboard image, and every Android adaptive-icon density + splash drawable, into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`.

After regenerating, run `npx cap sync` so the native projects pick up the new files. The generated PNGs are gitignored — only the SVG sources are tracked.

The runtime splash is configured in [capacitor.config.ts](capacitor.config.ts) (background, fade duration, spinner) and the JS side calls `SplashScreen.hide({ fadeOutDuration: 300 })` from [app.component.ts](src/app/app.component.ts) once Angular bootstraps, so the splash dismisses smoothly even on fast warm starts.

## Project layout

```
src/app/
  guards/             # route guards (auth / no-auth)
  models/             # Sport, Venue, Booking, UserProfile
  pages/
    onboarding/       # 3-step intro
    auth/             # sign-in, sign-up
    tabs/             # bottom-tab shell
    home/             # map + nearby venues (Discover tab)
    venue/            # venue detail + booking form
    bookings/         # my bookings
    profile/          # profile + settings
  services/
    auth.service.ts          # Firebase auth + biometric integration
    biometric.service.ts     # FaceID/TouchID wrapper
    geolocation.service.ts   # current location, haversine
    google-maps-loader.service.ts
    places.service.ts        # Google Places nearby/details
    booking.service.ts       # Firestore CRUD for bookings
  shared/             # shared components, pipes, SharedModule
```

## Booking model

Google Places gives us venues but doesn't expose real availability. Bookings are stored in Firestore against the venue's stable `place_id`. Conflicts within a slot are detected client-side: a soft cap of 3 concurrent bookings per venue+overlap window is enforced (tune in [booking.service.ts](src/app/services/booking.service.ts)).

For a real production booking flow you would either partner with venues for true availability data, or keep the current model and treat bookings as user-organized matches.

## Publishing

- **Google Play**: produce a signed AAB from Android Studio → Build → Generate Signed Bundle. Use [Play Console](https://play.google.com/console) to upload.
- **Apple App Store**: archive in Xcode → Distribute App → App Store Connect.

Both stores require an app icon, splash screen, privacy policy, and screenshots — generate icons with `npx @capacitor/assets generate` after creating `assets/icon.png` and `assets/splash.png`.

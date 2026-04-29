import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.sportsmatcher',
  appName: 'SportsMatcher',
  webDir: 'www',
  plugins: {
    GoogleMaps: {
      // Native Maps API keys are configured per-platform — see README.
    },
    SplashScreen: {
      // Show for up to 2.5s while the web bundle loads, then fade out.
      // We also call SplashScreen.hide() from app.component.ts as soon as
      // Angular bootstraps, so on a warm start it'll dismiss faster.
      launchShowDuration: 2500,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: '#0b1120',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#0ea2ff',
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false
    }
  }
};

export default config;

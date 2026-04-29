import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.sportsmatcher',
  appName: 'SportsMatcher',
  webDir: 'www',
  plugins: {
    GoogleMaps: {
      // The native iOS/Android Google Maps API keys are configured below.
      // Replace these placeholders with your real keys before building native.
    }
  }
};

export default config;

// Production environment. Replace placeholders with real credentials before
// publishing to PlayStore / AppStore. Prefer injecting these at build time
// from a CI secret rather than committing them to source.

export const environment = {
  production: true,
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID'
  },
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_BROWSER_KEY'
  }
};

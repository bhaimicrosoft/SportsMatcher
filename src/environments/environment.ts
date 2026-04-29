// Replace these placeholder values with your real Firebase + Google Maps credentials.
// See README.md for instructions. Do NOT commit real keys to a public repo.

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
  }
};

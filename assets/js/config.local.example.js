// Local development configuration
// This file is git-ignored and should contain your local API keys
// Copy this file to config.local.js and add your actual keys

window.LOCAL_CONFIG = {
  // TMDb API Key - get from https://www.themoviedb.org/settings/api
  TMDB_API_KEY: 'your_tmdb_api_key_here',
  
  // Firebase configuration - get from Firebase Console
  FIREBASE: {
    API_KEY: 'your_firebase_api_key_here',
    AUTH_DOMAIN: 'your_project_id.firebaseapp.com',
    PROJECT_ID: 'your_project_id',
    STORAGE_BUCKET: 'your_project_id.appspot.com',
    MESSAGING_SENDER_ID: '123456789',
    APP_ID: '1:123456789:web:abcdef123456789'
  }
};

/*
SETUP INSTRUCTIONS:

1. Get TMDb API Key:
   - Go to https://www.themoviedb.org/settings/api
   - Request an API key (it's free)
   - Replace 'your_tmdb_api_key_here' with your actual key

2. Set up Firebase:
   - Go to https://console.firebase.google.com/
   - Create a new project
   - Enable Authentication (Email/Password and Google)
   - Enable Firestore Database
   - Get your config from Project Settings > General > Your apps
   - Replace the Firebase values above with your actual config

3. Copy this file to config.local.js in the same directory
   - The .local.js file is git-ignored for security

4. For production deployment:
   - Use environment variables instead of this file
   - See docs/API_SECURITY.md for deployment instructions
*/

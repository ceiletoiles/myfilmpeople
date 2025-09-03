// Configuration file for API keys and settings
// This file loads API keys from environment variables and secure sources

const CONFIG = {
  // TMDb API configuration
  TMDB: {
    BASE_URL: 'https://api.themoviedb.org/3',
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/',
    // API key loaded from secure environment
    API_KEY: getApiKeyFromEnvironment(),
  },
  
  // Firebase configuration
  FIREBASE: {
    API_KEY: getFirebaseConfigFromEnvironment('API_KEY'),
    AUTH_DOMAIN: getFirebaseConfigFromEnvironment('AUTH_DOMAIN'),
    PROJECT_ID: getFirebaseConfigFromEnvironment('PROJECT_ID'),
    STORAGE_BUCKET: getFirebaseConfigFromEnvironment('STORAGE_BUCKET'),
    MESSAGING_SENDER_ID: getFirebaseConfigFromEnvironment('MESSAGING_SENDER_ID'),
    APP_ID: getFirebaseConfigFromEnvironment('APP_ID')
  },
  
  // Other configuration
  LETTERBOXD: {
    BASE_URL: 'https://letterboxd.com'
  }
};

/**
 * Get Firebase config from secure sources without exposing it in code
 */
function getFirebaseConfigFromEnvironment(configKey) {
  // For Netlify/Vercel - environment variables injected at build time
  if (typeof window !== 'undefined' && window[`NETLIFY_ENV_FIREBASE_${configKey}`]) {
    return window[`NETLIFY_ENV_FIREBASE_${configKey}`];
  }
  
  // For production builds with environment injection
  if (typeof window !== 'undefined' && window[`ENV_FIREBASE_${configKey}`]) {
    return window[`ENV_FIREBASE_${configKey}`];
  }
  
  // For Node.js environments
  if (typeof process !== 'undefined' && process.env && process.env[`FIREBASE_${configKey}`]) {
    return process.env[`FIREBASE_${configKey}`];
  }
  
  // For local development
  if (typeof window !== 'undefined' && window.LOCAL_CONFIG && window.LOCAL_CONFIG.FIREBASE && window.LOCAL_CONFIG.FIREBASE[configKey]) {
    return window.LOCAL_CONFIG.FIREBASE[configKey];
  }
  
  return null;
}

/**
 * Get API key from secure sources without exposing it in code
 * This function checks multiple secure sources for the API key
 */
function getApiKeyFromEnvironment() {
  // For Netlify/Vercel - environment variables injected at build time
  if (typeof window !== 'undefined' && window.NETLIFY_ENV_TMDB_API_KEY) {
    console.log('✅ Using Netlify environment API key');
    return window.NETLIFY_ENV_TMDB_API_KEY;
  }
  
  // For production builds with environment injection
  if (typeof window !== 'undefined' && window.ENV_TMDB_API_KEY) {
    console.log('✅ Using production environment API key');
    return window.ENV_TMDB_API_KEY;
  }
  
  // For Node.js environments (if using build tools)
  if (typeof process !== 'undefined' && process.env && process.env.TMDB_API_KEY) {
    console.log('✅ Using Node.js environment API key');
    return process.env.TMDB_API_KEY;
  }
  
  // For local development - load from git-ignored config
  if (typeof window !== 'undefined' && window.LOCAL_CONFIG && window.LOCAL_CONFIG.TMDB_API_KEY) {
    console.log('✅ Using local development API key');
    return window.LOCAL_CONFIG.TMDB_API_KEY;
  }
  
  // If no API key is found, show helpful error
  console.error('⚠️ TMDB API key not found! Please set up your environment:');
  console.error('🔧 For development: Create assets/js/config.local.js with your API key');
  console.error('🚀 For Netlify: Set TMDB_API_KEY environment variable in Netlify dashboard');
  console.error('📚 See docs/API_SECURITY.md for detailed setup instructions');
  
  // Return null instead of exposing any key
  return null;
}

/**
 * Check if API key is properly configured
 */
function isApiKeyConfigured() {
  return CONFIG.TMDB.API_KEY !== null && CONFIG.TMDB.API_KEY !== undefined;
}

// Validate configuration on load
if (!isApiKeyConfigured()) {
  console.warn('🚫 MyFilmPeople: API key not configured. App will run in limited mode.');
  console.warn('📖 Check docs/API_SECURITY.md for setup instructions');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, isApiKeyConfigured };
} else {
  window.CONFIG = CONFIG;
  window.isApiKeyConfigured = isApiKeyConfigured;
}

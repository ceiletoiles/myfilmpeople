// Production Environment Loader for Netlify/Vercel
// This script loads environment variables for production deployments

(function() {
  'use strict';
  
  // For manual build replacement (build scripts)
  const buildApiKey = '{{TMDB_API_KEY}}';
  if (buildApiKey !== '{{TMDB_API_KEY}}') {
    window.ENV_TMDB_API_KEY = buildApiKey;
    console.log('🚀 Build-injected API key loaded');
    return;
  }
  
  // For environments that can access process.env (like Netlify Functions)
  try {
    if (typeof process !== 'undefined' && process.env && process.env.TMDB_API_KEY) {
      window.ENV_TMDB_API_KEY = process.env.TMDB_API_KEY;
      console.log('🚀 Process environment API key loaded');
      return;
    }
  } catch (e) {
    // Process not available in browser
  }
  
  // For Netlify - using a build hook approach
  // This will be replaced by Netlify's build process
  const netlifyKey = process.env.TMDB_API_KEY;
  if (typeof netlifyKey === 'string' && netlifyKey !== 'undefined') {
    window.NETLIFY_ENV_TMDB_API_KEY = netlifyKey;
    console.log('Netlify environment API key loaded');
    return;
  }
  
  console.log('ℹ️ No production environment variable found - will check local config');
  
})();

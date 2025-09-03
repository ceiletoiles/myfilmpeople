/**
 * Environment Configuration Loader
 * Safely loads API keys from environment variables and .env files
 * This provides an extra layer of security for API key management
 */

// Environment configuration object
window.ENV_CONFIG = {
    TMDB_API_KEY: null,
    NODE_ENV: 'development',
    APP_NAME: 'MyFilmPeople',
    loaded: false
};

/**
 * Load environment variables from .env file (for local development)
 * This function safely parses .env content without exposing keys in code
 */
async function loadEnvFile() {
    try {
        // Try to load main .env file from config folder
        let response = await fetch('./config/.env');
        if (response.ok) {
            const envContent = await response.text();
            parseEnvContent(envContent);
            console.log('🔐 Loaded environment from config/.env');
            return true;
        }
        
        // Fallback to config/.env.local
        response = await fetch('./config/.env.local');
        if (response.ok) {
            const envContent = await response.text();
            parseEnvContent(envContent);
            console.log('🔐 Loaded environment from config/.env.local');
            return true;
        }
        
        // Legacy fallback to root .env
        response = await fetch('./.env');
        if (response.ok) {
            const envContent = await response.text();
            parseEnvContent(envContent);
            console.log('🔐 Loaded environment from .env');
            return true;
        }
    } catch (error) {
        console.log('📝 No .env file found (this is normal for production)');
    }
    
    return false;
}

/**
 * Parse environment file content safely
 */
function parseEnvContent(content) {
    const lines = content.split('\n');
    
    lines.forEach(line => {
        line = line.trim();
        
        // Skip comments and empty lines
        if (line.startsWith('#') || !line) return;
        
        // Parse KEY=value format
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        
        if (key && value) {
            // Store in environment config
            window.ENV_CONFIG[key] = value;
            
            // Also set as global for compatibility
            if (key === 'TMDB_API_KEY') {
                window.LOCAL_ENV_TMDB_API_KEY = value;
            }
        }
    });
}

/**
 * Get API key from multiple secure sources
 */
function getSecureApiKey() {
    // Priority 1: Netlify build-time injection
    if (window.NETLIFY_ENV_TMDB_API_KEY) {
        console.log('🌐 Using Netlify build environment');
        return window.NETLIFY_ENV_TMDB_API_KEY;
    }
    
    // Priority 2: Local environment file
    if (window.LOCAL_ENV_TMDB_API_KEY) {
        console.log('🔐 Using local environment file');
        return window.LOCAL_ENV_TMDB_API_KEY;
    }
    
    // Priority 3: Manual config (legacy)
    if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.TMDB_API_KEY) {
        console.log('🏠 Using legacy local config');
        return window.LOCAL_CONFIG.TMDB_API_KEY;
    }
    
    // Priority 4: Environment config
    if (window.ENV_CONFIG && window.ENV_CONFIG.TMDB_API_KEY) {
        console.log('⚙️ Using environment config');
        return window.ENV_CONFIG.TMDB_API_KEY;
    }
    
    console.error('❌ No API key found in any secure source');
    console.log('💡 Create .env.local with TMDB_API_KEY=your_key_here');
    return null;
}

/**
 * Initialize environment configuration
 */
async function initializeEnvironment() {
    console.log('🔧 Initializing secure environment...');
    
    // Try to load .env file first
    await loadEnvFile();
    
    // Get API key from secure sources
    const apiKey = getSecureApiKey();
    
    if (apiKey) {
        window.ENV_CONFIG.TMDB_API_KEY = apiKey;
        window.ENV_CONFIG.loaded = true;
        console.log('✅ Environment initialized successfully');
    } else {
        console.error('❌ Failed to initialize environment');
        console.log('📖 See docs/API_SECURITY.md for setup instructions');
    }
    
    return window.ENV_CONFIG;
}

// Auto-initialize when script loads
initializeEnvironment();

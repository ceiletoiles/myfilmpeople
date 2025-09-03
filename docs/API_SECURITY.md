# API Key Security Setup

This project implements **zero-exposure API key security** - no hardcoded keys anywhere in the source code.

## Security Features

✅ **No hardcoded API keys in source code**  
✅ **Environment-based configuration**  
✅ **Automatic development/production detection**  
✅ **Helpful error messages for missing configuration**  
✅ **Build scripts for secure deployment**  

## Development Setup

### Step 1: Get Your API Key
1. Go to https://www.themoviedb.org/
2. Create a free account
3. Go to Settings > API
4. Request an API key (free)

### Step 2: Run Setup Script (Recommended)
```powershell
# From project root
.\scripts\setup-env.ps1
```

This creates:
- `config/.env` - Main environment file with your API key
- `config/.env.local` - Backup environment file
- `assets/js/config.local.js` - JavaScript fallback config

### Step 3: Manual Setup (Alternative)
Create `config/.env` file:
```bash
TMDB_API_KEY=your_api_key_here
NODE_ENV=development
APP_NAME=MyFilmPeople
```

### Step 4: Test Locally
Open `index.html` in your browser - it should work with TMDb data.

## Production Deployment

### 🌐 Netlify Deployment (Recommended)

**Step 1: Set Environment Variable in Netlify**
1. Go to your Netlify site dashboard
2. Navigate to **Site settings > Environment variables**  
3. Click **Add variable**
4. Set:
   - **Key**: `TMDB_API_KEY`
   - **Value**: `` (your actual API key)
   - **Scopes**: Leave default (All scopes)

**Step 2: Deploy Your Site**
1. Connect your GitHub repository to Netlify
2. The build script (`build-netlify.sh`) will automatically:
   - Take your API key from the environment variable
   - Create `assets/js/env.netlify.js` with the secure key
   - Update HTML files to load the production environment
3. Your site will work with the API key securely embedded

**How It Works:**
- **Build Time**: Netlify runs `build-netlify.sh` which injects your API key
- **Runtime**: App loads key from `window.NETLIFY_ENV_TMDB_API_KEY`  
- **Security**: API key never committed to git, only exists in built files

**Verification:** After deployment, check browser console for:
```
🌐 Using Netlify environment API key
✅ TMDb API configuration initialized successfully
```

### 🔧 Manual Build (Alternative)

Use the provided build scripts to create a secure production build:

**Windows PowerShell:**
```powershell
.\build-production.ps1 -ApiKey "your_api_key_here"
```

**Linux/macOS:**
```bash
export TMDB_API_KEY="your_api_key_here"
./build-production.sh
```

This creates a `dist/` folder with:
- ✅ API key securely embedded in production files
- ✅ All sensitive development files removed
- ✅ No environment variables needed on server
3. **Deploy** - the app will automatically detect the environment key

### Option 3: Custom Build Integration

For webpack, Vite, or other build tools:

```javascript
// webpack.config.js example
new webpack.DefinePlugin({
  'process.env.TMDB_API_KEY': JSON.stringify(process.env.TMDB_API_KEY)
});
```

## File Structure

```
assets/js/
├── config.js                    # Main config (✅ safe to commit)
├── config.local.js              # Local dev keys (❌ git-ignored)
├── env.production.js            # Production loader (✅ safe to commit)
├── script.js                    # Main app (✅ no keys)
├── movie.js                     # Movie page (✅ no keys)
└── profile.js                   # Profile page (✅ no keys)
```

## How It Works

### Development Flow:
1. `config.js` loads and calls `getApiKeyFromEnvironment()`
2. Function checks `window.LOCAL_CONFIG.TMDB_API_KEY`
3. If found, app works normally
4. If not found, shows setup instructions

### Production Flow:
1. Build script injects API key into `env.production.js`
2. `env.production.js` sets `window.ENV_TMDB_API_KEY`
3. `config.js` detects and uses the environment key
4. App works normally with no exposed secrets

## Error Handling

If no API key is configured, the app shows helpful error messages instead of breaking:

- **Main app**: Shows setup instructions in the search area
- **Movie pages**: Shows configuration guide with back button
- **Profile pages**: Shows detailed setup instructions

## Security Benefits

🔒 **Zero source code exposure** - No API keys in any committed files  
🔒 **Environment-based secrets** - Keys only in environment/build process  
🔒 **Development isolation** - Local keys never leave your machine  
🔒 **Production security** - Keys embedded securely during build  
🔒 **Git safety** - Impossible to accidentally commit sensitive data  

## Troubleshooting

### "API Configuration Required" Error
- **Development**: Create `assets/js/config.local.js` with your API key
- **Production**: Ensure `TMDB_API_KEY` environment variable is set

### Build Script Issues
- **Windows**: Run PowerShell as Administrator if needed
- **Linux/macOS**: Make script executable: `chmod +x build-production.sh`

### Platform-Specific Setup

**Netlify:**
```bash
# In Netlify dashboard
Site settings > Environment variables > Add:
TMDB_API_KEY = your_key_here
```

**Vercel:**
```bash
# Via Vercel CLI
vercel env add TMDB_API_KEY
```

**GitHub Pages:**
Use the build script to create a secure `dist/` folder, then deploy that folder.

## Migration from Old Setup

If you had hardcoded keys before:

1. ✅ **All JavaScript files updated** - No more hardcoded keys
2. ✅ **Local config created** - `config.local.js` with your key
3. ✅ **Gitignore updated** - Sensitive files excluded
4. ✅ **Build scripts provided** - For secure deployment

Your app now has **enterprise-grade API key security**!

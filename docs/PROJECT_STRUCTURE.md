# MyFilmPeople - Project Structure

## 📁 Organized Folder Structure

```
📁 MyFilmPeople/
├── 📄 index.html              # Main app page
├── 📄 movie.html              # Movie details page  
├── 📄 profile.html            # Profile page
├── 📄 README.md               # Project documentation
├── 📄 netlify.toml            # Netlify deployment config
├── 📄 robots.txt              # SEO robots file
│
├── 📁 assets/                 # Static assets
│   ├── 📁 css/               # Stylesheets
│   ├── 📁 js/                # JavaScript files
│   ├── 📁 images/            # Images and icons
│   └── 📁 extra/             # Extra assets
│
├── 📁 config/                 # 🔒 SECURE CONFIG (git-ignored)
│   ├── 🔐 .env               # Main environment variables
│   ├── 🔐 .env.local         # Local environment backup
│   ├── 📄 .env.example       # Environment template
│   └── 🔐 api-keys.txt       # Multiple API keys collection
│
├── 📁 scripts/               # Build and setup scripts
│   ├── ⚙️ setup-env.ps1      # Development environment setup
│   ├── ⚙️ setup-dev.ps1      # Legacy setup script
│   ├── 🚀 build-netlify.sh   # Netlify production build
│   └── 🏭 build-production.ps1 # Manual production build
│
└── 📁 docs/                  # Documentation
    ├── 📚 API_SECURITY.md    # Security implementation guide
    ├── 💡 FEATURE_IDEAS.md   # Future features
    └── 📋 IMPROVEMENT_PLAN.md # Development roadmap
```

## 🔒 Security Features

### Protected Files (git-ignored):
- `config/` - **Entire folder protected**
- `config/.env` - Main environment variables
- `config/.env.local` - Local development backup  
- `config/api-keys.txt` - Your multiple API keys collection
- `assets/js/config.local.js` - JavaScript config file

### Safe Files (can be committed):
- `config/.env.example` - Template for other developers
- All HTML, CSS, JS files in assets/
- Documentation and scripts

## 🚀 Quick Start

### For Development:
```powershell
# Run from project root
.\scripts\setup-env.ps1
```

### For Production (Netlify):
1. Set `TMDB_API_KEY` in Netlify dashboard
2. Deploy - `scripts/build-netlify.sh` runs automatically

## 🔗 File Connections

### Environment Loading Chain:
1. `config/.env` → 2. `config/.env.local` → 3. `assets/js/config.local.js`

### Build Process:
1. `scripts/setup-env.ps1` → Creates local config files
2. `scripts/build-netlify.sh` → Creates production config files  
3. `netlify.toml` → Points to build script

### App Loading:
1. HTML files → Load `assets/js/config.js`
2. `config.js` → Calls `env.config.js` 
3. `env.config.js` → Loads from `config/.env` files
4. Main app scripts use `CONFIG.TMDB.API_KEY`

## 📱 How to Use

1. **Setup**: Run `scripts\setup-env.ps1` once
2. **Develop**: Open `index.html` in browser
3. **Deploy**: Push to GitHub, Netlify handles the rest
4. **Secure**: All sensitive files auto-protected by `.gitignore`

Your API keys are now completely secure and organized! 🎉

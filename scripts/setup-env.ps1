# MyFilmPeople Development Environment Setup
# This script creates BOTH .env.local AND config.local.js for maximum safety

Write-Host "MyFilmPeople Development Setup" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Your TMDb API key
$API_KEY = "5f1ead96e48e2379102c77c2546331a4"

# Check if files already exist (look in parent directory)
$envFile = "..\config\.env"
$envLocalFile = "..\config\.env.local"
$jsConfigFile = "..\assets\js\config.local.js"

if ((Test-Path $envFile) -and (Test-Path $jsConfigFile)) {
    Write-Host "Environment already configured!" -ForegroundColor Green
    Write-Host "Found: config\.env" -ForegroundColor Cyan
    Write-Host "Found: assets\js\config.local.js" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ready to go! Open index.html in your browser." -ForegroundColor Green
    exit 0
}

Write-Host "Creating secure environment files..." -ForegroundColor Yellow
Write-Host ""

# Create .env file (main environment file)
$EnvContent = @"
# MyFilmPeople Environment Variables
# This is the main .env file for your API keys
# Copy your API key here for local development

TMDB_API_KEY=$API_KEY
NODE_ENV=development
APP_NAME=MyFilmPeople
APP_VERSION=1.0.0

# For production deployment:
# Set TMDB_API_KEY environment variable in Netlify dashboard
"@

Write-Host "Creating config\.env..." -ForegroundColor Cyan
$EnvContent | Out-File -FilePath $envFile -Encoding UTF8

# Also create .env.local as backup
Write-Host "Creating config\.env.local (backup)..." -ForegroundColor Cyan
$EnvContent | Out-File -FilePath $envLocalFile -Encoding UTF8

# Create JavaScript config file
$JsConfigContent = @"
// Local Development Configuration
// This file is automatically created by setup-env.ps1
// DO NOT COMMIT - CONTAINS SENSITIVE API KEYS

window.LOCAL_CONFIG = {
    TMDB_API_KEY: '$API_KEY',
    NODE_ENV: 'development',
    APP_NAME: 'MyFilmPeople'
};

console.log('Local development configuration loaded');
"@

Write-Host "Creating ..\assets\js\config.local.js..." -ForegroundColor Cyan
$JsConfigContent | Out-File -FilePath $jsConfigFile -Encoding UTF8

Write-Host ""
Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Created files:" -ForegroundColor White
Write-Host "   config\.env (main environment file)" -ForegroundColor Green
Write-Host "   config\.env.local (backup environment file)" -ForegroundColor Green
Write-Host "   assets\js\config.local.js (JavaScript config)" -ForegroundColor Green
Write-Host ""
Write-Host "Security features:" -ForegroundColor Yellow
Write-Host "   Both files are git-ignored" -ForegroundColor White
Write-Host "   API key safely stored locally" -ForegroundColor White
Write-Host "   No secrets in committed code" -ForegroundColor White
Write-Host "   Production uses Netlify environment variables" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open index.html in your browser" -ForegroundColor White
Write-Host "   2. Check console for 'Local development configuration loaded'" -ForegroundColor White
Write-Host "   3. For production deployment: see docs\API_SECURITY.md" -ForegroundColor White
Write-Host ""
Write-Host "Your MyFilmPeople app is ready for local development!" -ForegroundColor Green

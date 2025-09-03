# Development Setup Script for MyFilmPeople
param(
    [Parameter(Mandatory=$false)]
    [string]$ApiKey
)

Write-Host "MyFilmPeople Development Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Check if config.local.js already exists
$configFile = "assets\js\config.local.js"

if (Test-Path $configFile) {
    Write-Host "Local configuration already exists" -ForegroundColor Green
    Write-Host "You're all set! Open index.html in your browser." -ForegroundColor Green
    exit 0
}

# If no API key provided, ask for it
if ([string]::IsNullOrEmpty($ApiKey)) {
    Write-Host "TMDb API Key Required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get a free API key:" -ForegroundColor White
    Write-Host "1. Go to https://www.themoviedb.org/" -ForegroundColor White
    Write-Host "2. Create account and request API key" -ForegroundColor White
    Write-Host ""
    
    $ApiKey = Read-Host "Enter your TMDb API key"
    
    if ([string]::IsNullOrEmpty($ApiKey)) {
        Write-Host "No API key provided. Setup cancelled." -ForegroundColor Red
        exit 1
    }
}

# Create directory if needed
$dir = "assets\js"
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Create configuration file
$configContent = @"
// Local configuration file for development
window.LOCAL_CONFIG = {
  TMDB_API_KEY: '$ApiKey'
};
"@

Set-Content -Path $configFile -Value $configContent -Encoding UTF8
Write-Host "Created local configuration file" -ForegroundColor Green

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Open index.html in your browser to test" -ForegroundColor Green

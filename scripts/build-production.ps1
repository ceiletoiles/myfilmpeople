# Build script for production deployment (PowerShell)
# This script shows how to inject API keys securely during build

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

Write-Host "🚀 Building MyFilmPeople for production..." -ForegroundColor Green

# Validate API key
if ([string]::IsNullOrEmpty($ApiKey)) {
    Write-Host "❌ Error: API key is required" -ForegroundColor Red
    Write-Host "💡 Usage: .\build-production.ps1 -ApiKey 'your_api_key_here'" -ForegroundColor Yellow
    exit 1
}

# Create build directory
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}
New-Item -ItemType Directory -Name "dist" | Out-Null
Write-Host "📁 Created dist directory" -ForegroundColor Blue

# Copy all files to dist (excluding sensitive ones)
$excludeItems = @("dist", ".git", "API Keys", "config.local.js", ".env*")
Get-ChildItem -Path "." | Where-Object { 
    $item = $_
    -not ($excludeItems | Where-Object { $item.Name -like $_ }) 
} | Copy-Item -Destination "dist" -Recurse -Force

Write-Host "📋 Copied source files" -ForegroundColor Blue

# Remove any sensitive files that might have been copied
$sensitiveFiles = @(
    "dist\assets\js\config.local.js",
    "dist\API Keys"
)

foreach ($file in $sensitiveFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "🧹 Removed $file" -ForegroundColor Yellow
    }
}

# Inject API key into production environment file
$envFile = "dist\assets\js\env.production.js"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    $content = $content -replace '\{\{TMDB_API_KEY\}\}', $ApiKey
    Set-Content $envFile $content
    Write-Host "🔐 Injected API key into production build" -ForegroundColor Green
}

# Update HTML files to use production environment loader
Get-ChildItem "dist\*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Add production environment script before config.js
    $content = $content -replace 
        '<script src="assets/js/config.js"></script>', 
        "<script src=`"assets/js/env.production.js`"></script>`n    <script src=`"assets/js/config.js`"></script>"
    
    # Remove local config script
    $content = $content -replace '\s*<script src="assets/js/config.local.js"></script>\s*', "`n"
    
    Set-Content $_.FullName $content
}
Write-Host "🔄 Updated HTML files for production" -ForegroundColor Blue

# Validate that API key was injected correctly
$envContent = Get-Content "dist\assets\js\env.production.js" -Raw
if ($envContent -match '\{\{TMDB_API_KEY\}\}') {
    Write-Host "❌ Error: API key template was not replaced!" -ForegroundColor Red
    exit 1
}

Write-Host "" 
Write-Host "✅ Build complete! Files are in the dist\ directory" -ForegroundColor Green
Write-Host "🚀 Ready for deployment" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Deployment files:" -ForegroundColor Cyan
Write-Host "   - Upload the entire dist\ directory to your web server" -ForegroundColor White
Write-Host "   - No sensitive data is included in the build" -ForegroundColor White
Write-Host "   - API key is securely embedded in the production files" -ForegroundColor White

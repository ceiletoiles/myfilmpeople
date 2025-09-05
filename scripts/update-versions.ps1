# Update version numbers automatically for cache busting
param(
    [string]$VersionType = "patch"  # major, minor, patch
)

$configFile = "config\version.json"

# Create version config if it doesn't exist
if (!(Test-Path $configFile)) {
    $initialVersion = @{
        major = 1
        minor = 0
        patch = 0
    }
    $initialVersion | ConvertTo-Json | Set-Content $configFile
    Write-Host "Created initial version file: 1.0.0"
}

# Read current version
$version = Get-Content $configFile | ConvertFrom-Json

# Increment version based on type
switch ($VersionType) {
    "major" { 
        $version.major++
        $version.minor = 0
        $version.patch = 0
    }
    "minor" { 
        $version.minor++
        $version.patch = 0
    }
    "patch" { 
        $version.patch++
    }
}

# Create version string
$versionString = "$($version.major).$($version.minor).$($version.patch)"
Write-Host "Updating to version: $versionString"

# Update version file
$version | ConvertTo-Json | Set-Content $configFile

# Update HTML files
$htmlFiles = @("index.html", "movie.html", "profile.html")

foreach ($file in $htmlFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Update CSS version
        $content = $content -replace 'href="assets/css/([^"]+\.css)\?v=[^"]*"', "href=`"assets/css/`$1?v=$versionString`""
        $content = $content -replace 'href="assets/css/([^"]+\.css)"', "href=`"assets/css/`$1?v=$versionString`""
        
        # Update JS version
        $content = $content -replace 'src="assets/js/([^"]+\.js)\?v=[^"]*"', "src=`"assets/js/`$1?v=$versionString`""
        $content = $content -replace 'src="assets/js/([^"]+\.js)"', "src=`"assets/js/`$1?v=$versionString`""
        
        Set-Content $file $content -NoNewline
        Write-Host "Updated $file"
    }
}

Write-Host "Version update complete: $versionString"
Write-Host "Run this before each deployment to ensure fresh assets."

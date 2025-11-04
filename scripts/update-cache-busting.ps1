# Generate content-based hashes for cache busting
param(
    [switch]$UseHashes
)

function Get-FileHash-Short {
    param([string]$FilePath)
    $hash = Get-FileHash $FilePath -Algorithm SHA256
    return $hash.Hash.Substring(0, 8).ToLower()
}

function Update-AssetReferences {
    param(
        [string]$HtmlFile,
        [hashtable]$AssetHashes
    )
    
    $content = Get-Content $HtmlFile -Raw
    
    foreach ($asset in $AssetHashes.Keys) {
        $hash = $AssetHashes[$asset]
        $assetPath = $asset -replace "\\", "/"
        
        # Update references with hash - escape special regex characters
        $escapedPath = [regex]::Escape($assetPath)
        if ($UseHashes) {
            $content = $content -replace "($escapedPath)(\?v=[^""']*)?", "`$1?v=$hash"
        } else {
            # Use timestamp
            $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
            $content = $content -replace "($escapedPath)(\?v=[^""']*)?", "`$1?v=$timestamp"
        }
    }
    
    Set-Content $HtmlFile $content -NoNewline
}

# Find all CSS and JS files that are actually referenced in HTML files
$cssFiles = Get-ChildItem "assets\css\*.css" -Recurse
$jsFiles = Get-ChildItem "assets\js\*.js" -Recurse

# Also include config.local.js even if it might not exist (has onerror handler)
$configLocalPath = "assets\js\config.local.js"
if (-not (Test-Path $configLocalPath)) {
    Write-Host "Note: $configLocalPath not found, but it's referenced in HTML with error handler"
}

$assetHashes = @{}

# Generate hashes for each file that exists
foreach ($file in ($cssFiles + $jsFiles)) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    
    if ($UseHashes) {
        $hash = Get-FileHash-Short $file.FullName
    } else {
        $hash = [int][double]::Parse((Get-Date -UFormat %s))
    }
    
    $assetHashes[$relativePath] = $hash
    Write-Host "Asset: $relativePath -> $hash"
}

# Also handle config.local.js even if it doesn't exist (referenced with onerror)
if (-not (Test-Path $configLocalPath)) {
    if ($UseHashes) {
        $hash = "missing00"  # Placeholder hash for missing file
    } else {
        $hash = [int][double]::Parse((Get-Date -UFormat %s))
    }
    $assetHashes["assets/js/config.local.js"] = $hash
    Write-Host "Asset: assets/js/config.local.js -> $hash (missing file)"
}

# Update all HTML files
$htmlFiles = @("index.html", "movie.html", "profile.html", "movie-search.html", "collaboration.html", "upcoming.html")

foreach ($htmlFile in $htmlFiles) {
    if (Test-Path $htmlFile) {
        Update-AssetReferences $htmlFile $assetHashes
        Write-Host "Updated references in $htmlFile"
    }
}

Write-Host "Cache busting update complete!"
if ($UseHashes) {
    Write-Host "Using content-based hashes (recommended for production)"
} else {
    Write-Host "Using timestamp (good for development)"
}

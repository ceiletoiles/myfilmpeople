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
        
        # Update references with hash
        if ($UseHashes) {
            $content = $content -replace "($assetPath)(\?v=[^""]*)?", "`$1?v=$hash"
        } else {
            # Use timestamp
            $timestamp = [int][double]::Parse((Get-Date -UFormat %s))
            $content = $content -replace "($assetPath)(\?v=[^""]*)?", "`$1?v=$timestamp"
        }
    }
    
    Set-Content $HtmlFile $content -NoNewline
}

# Find all CSS and JS files
$cssFiles = Get-ChildItem "assets\css\*.css" -Recurse
$jsFiles = Get-ChildItem "assets\js\*.js" -Recurse

$assetHashes = @{}

# Generate hashes for each file
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

# Update all HTML files
$htmlFiles = @("index.html", "movie.html", "profile.html")

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

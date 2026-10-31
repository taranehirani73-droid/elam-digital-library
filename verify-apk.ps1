param([string]$ApkPath = (Join-Path $PSScriptRoot 'dist/elam-library-0.3.0.apk'), [string]$AssetRoot = (Join-Path $PSScriptRoot 'app/src/main/assets'), [string]$Prefix = 'assets/')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$assetRoot = $AssetRoot
$archive = [System.IO.Compression.ZipFile]::OpenRead($ApkPath)
try {
    foreach ($entry in $archive.Entries) {
        if ($entry.FullName.Contains('\')) { throw "Non-portable archive path: $($entry.FullName)" }
    }
    $files = @(Get-ChildItem -LiteralPath $assetRoot -Recurse -File)
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($assetRoot.Length + 1).Replace('\','/')
        $entry = $archive.GetEntry($Prefix + $relative)
        if (-not $entry) { throw "Missing APK asset: $relative" }
        $stream = $entry.Open()
        $digest = [System.Security.Cryptography.SHA256]::Create()
        try {
            $packedHash = [Convert]::ToHexString($digest.ComputeHash($stream))
            $diskHash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            if ($packedHash -ne $diskHash) { throw "APK asset mismatch: $relative" }
        } finally { $stream.Dispose(); $digest.Dispose() }
    }
    if (-not $archive.GetEntry('classes.dex')) { throw 'Missing executable DEX' }
    Write-Output "PASS: All $($files.Count) local assets match APK contents; portable paths; executable DEX present."
} finally { $archive.Dispose() }

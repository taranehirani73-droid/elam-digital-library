$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.build-tools'
$jdkFolder = Get-ChildItem -LiteralPath (Join-Path $toolRoot 'java') -Directory | Select-Object -First 1
if (-not $jdkFolder) { throw 'Extract the verified JDK archive into .build-tools/java first.' }
$javaBin = Join-Path $jdkFolder.FullName 'bin'
$buildTools = Join-Path $toolRoot 'android-build/android-15'
$androidJar = Join-Path $toolRoot 'android-platform/android-35-ext15/android.jar'
$buildRoot = Join-Path $projectRoot 'build/manual'
$classes = Join-Path $buildRoot 'classes'
$dex = Join-Path $buildRoot 'dex'
$dist = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Force -Path $classes,$dex,$dist | Out-Null
function Run-Tool([string]$exe, [string[]]$toolArgs) {
    & $exe @toolArgs
    if ($LASTEXITCODE -ne 0) { throw "Build tool failed: $exe (exit $LASTEXITCODE)" }
}
Run-Tool (Join-Path $javaBin 'java.exe') @('-version')
$webFiles = Join-Path $projectRoot 'www'
if (-not (Test-Path -LiteralPath (Join-Path $webFiles 'index.html'))) { throw 'Run npm run build first.' }
$packagedAssets = Join-Path $buildRoot 'assets/public'
New-Item -ItemType Directory -Force -Path $packagedAssets | Out-Null
Copy-Item -Path (Join-Path $webFiles '*') -Destination $packagedAssets -Recurse -Force
$manifestPath = Join-Path $buildRoot 'AndroidManifest.xml'
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'app/src/main/AndroidManifest.xml') -Raw
$manifest = $manifest.Replace('<manifest ', '<manifest package="org.elam.library" ')
Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding utf8
$resources = Join-Path $buildRoot 'resources.zip'
Run-Tool (Join-Path $buildTools 'aapt2.exe') @('compile','--dir',(Join-Path $projectRoot 'app/src/main/res'),'-o',$resources)
$unsigned = Join-Path $buildRoot 'unsigned.apk'
Run-Tool (Join-Path $buildTools 'aapt2.exe') @('link','-I',$androidJar,'--manifest',$manifestPath,'--min-sdk-version','23','--target-sdk-version','35','--version-code','10','--version-name','1.0.0-light','-A',(Join-Path $buildRoot 'assets'),'-o',$unsigned,$resources)
Run-Tool (Join-Path $javaBin 'javac.exe') @('--release','8','-encoding','UTF-8','-classpath',$androidJar,'-d',$classes,(Join-Path $projectRoot 'app/src/main/java/org/elam/library/MainActivity.java'))
$classFiles = @(Get-ChildItem -LiteralPath $classes -Filter '*.class' -Recurse -File | ForEach-Object { $_.FullName })
Run-Tool (Join-Path $javaBin 'java.exe') (@('-cp',(Join-Path $buildTools 'lib/d8.jar'),'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','23','--output',$dex) + $classFiles)
Run-Tool (Join-Path $javaBin 'jar.exe') @('uf',$unsigned,'-C',$dex,'classes.dex')
# Windows AAPT2 can emit backslashes for nested asset names; Android expects '/'.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$assetArchive = [System.IO.Compression.ZipFile]::Open($unsigned, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    $windowsEntries = @($assetArchive.Entries | Where-Object { $_.FullName.Contains('\') })
    foreach ($entry in $windowsEntries) {
        $portableName = $entry.FullName.Replace('\','/')
        $newEntry = $assetArchive.CreateEntry($portableName)
        $inputStream = $entry.Open()
        $outputStream = $newEntry.Open()
        try { $inputStream.CopyTo($outputStream) }
        finally { $inputStream.Dispose(); $outputStream.Dispose() }
        $entry.Delete()
    }
} finally { $assetArchive.Dispose() }
$aligned = Join-Path $buildRoot 'aligned.apk'
Run-Tool (Join-Path $buildTools 'zipalign.exe') @('-f','-p','4',$unsigned,$aligned)
$key = Join-Path $toolRoot 'elam-debug.keystore'
if (-not (Test-Path -LiteralPath $key)) {
    Run-Tool (Join-Path $javaBin 'keytool.exe') @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','elam-debug','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Elam Library Test, O=Elam Library, C=IR')
}
$apk = Join-Path $dist 'elam-library-1.0.0-light.apk'
$signer = Join-Path $buildTools 'lib/apksigner.jar'
Run-Tool (Join-Path $javaBin 'java.exe') @('-jar',$signer,'sign','--ks',$key,'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','elam-debug','--out',$apk,$aligned)
Run-Tool (Join-Path $javaBin 'java.exe') @('-jar',$signer,'verify','--verbose',$apk)
Run-Tool (Join-Path $buildTools 'zipalign.exe') @('-c','-p','4',$apk)
Run-Tool (Join-Path $buildTools 'aapt2.exe') @('dump','badging',$apk)
& (Join-Path $projectRoot 'verify-apk.ps1') -ApkPath $apk -AssetRoot $webFiles -Prefix 'assets/public/'
Get-FileHash -LiteralPath $apk -Algorithm SHA256 | Format-List
Write-Output "APK ready: $apk"

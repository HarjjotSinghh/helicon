<#
Times Helicon's first run on a clean Windows PC.

Run from a normal (non-admin) PowerShell window:
  powershell -ExecutionPolicy Bypass -File .\scripts\windows-first-run-timing.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\windows-first-run-timing.ps1 -DownloadLatest
  powershell -ExecutionPolicy Bypass -File .\scripts\windows-first-run-timing.ps1 -InstallerPath "$HOME\Downloads\Helicon_0.22.2_x64-setup.exe"

How each step ends:
  1 Download and install   auto: the Helicon entry appears in the Windows uninstall list
  2 First launch           auto: the local server answers GET /api/health on the port in server-port
  3 Muse sign-in           keypress: Enter when Helicon shows you are signed in
  4 Open project folder    keypress: Enter when the folder is open
  5 First prompt           keypress: Enter when the first streamed reply token shows

Network: api.github.com and github.com only with -DownloadLatest. Health checks go to 127.0.0.1.
The script does not read Muse credentials or any login file.
#>
param(
    [string]$InstallerPath = '',
    [switch]$DownloadLatest,
    [switch]$AllowExisting
)

$ErrorActionPreference = 'Stop'

$ProductName = 'Helicon'
$Repo = 'HarjjotSinghh/helicon'
$AppId = 'app.helicon.desktop'
$ProcessName = 'helicon'
$InstallWaitSec = 900
$LaunchWaitSec = 1200

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$RunDir = Join-Path $env:TEMP ("helicon-timing-" + $stamp)
$CsvPath = Join-Path $env:TEMP ("helicon-timing-" + $stamp + ".csv")
New-Item -ItemType Directory -Path $RunDir -Force | Out-Null

$clock = [System.Diagnostics.Stopwatch]::StartNew()
$marks = New-Object System.Collections.ArrayList

function Add-Mark([string]$Label, [string]$Note = '') {
    $now = Get-Date
    [void]$marks.Add([pscustomobject]@{
        Label = $Label
        At    = $now
        Iso   = $now.ToString('o')
        Sec   = $clock.Elapsed.TotalSeconds
        Note  = $Note
    })
    Write-Host ("  [{0}] {1}" -f $now.ToString('HH:mm:ss'), $Label) -ForegroundColor Green
}

function Get-HeliconInstall {
    $keys = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($key in $keys) {
        $hit = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -eq $ProductName } |
            Select-Object -First 1
        if ($hit) { return $hit }
    }
    return $null
}

function Wait-ForInstall {
    $deadline = (Get-Date).AddSeconds($InstallWaitSec)
    while ((Get-Date) -lt $deadline) {
        $hit = Get-HeliconInstall
        if ($hit) { return $hit }
        Start-Sleep -Seconds 2
    }
    throw "Helicon did not appear in the uninstall list within $InstallWaitSec seconds. Check the installer window."
}

function Get-LatestInstaller {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" `
        -Headers @{ 'User-Agent' = 'helicon-first-run-timing' } -TimeoutSec 30
    $asset = @($release.assets | Where-Object { $_.name -match '_x64-setup\.exe$' })[0]
    if (-not $asset) { throw "No *_x64-setup.exe asset in release $($release.tag_name)." }
    $dest = Join-Path $RunDir $asset.name
    Write-Host "Downloading $($asset.name) from release $($release.tag_name) ..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dest -UseBasicParsing -TimeoutSec 900
    return $dest
}

function Wait-ForHealthy([datetime]$After) {
    $deadline = (Get-Date).AddSeconds($LaunchWaitSec)
    $port = 0
    $lastPort = 0
    while ((Get-Date) -lt $deadline) {
        # The port file is rewritten if the server had to move to a new port, so read it every pass.
        foreach ($dir in @((Join-Path $env:APPDATA $AppId), (Join-Path $env:LOCALAPPDATA $AppId))) {
            $file = Join-Path $dir 'server-port'
            if (Test-Path $file) {
                # A port file left by an earlier launch is fine to read: the script refuses to start while
                # Helicon is running, and a stale port just fails the health check until the new one lands.
                $value = 0
                if ([int]::TryParse((Get-Content -Path $file -Raw).Trim(), [ref]$value) -and $value -gt 0) {
                    $port = $value
                    break
                }
            }
        }
        if ($port -gt 0) {
            if ($port -ne $lastPort) { Write-Host "  server port $port"; $lastPort = $port }
            try {
                $health = Invoke-RestMethod -Uri "http://127.0.0.1:$port/api/health" -TimeoutSec 2
                if ($health.ok -eq $true) { return $health }
            } catch {
                # Not up yet. Keep polling.
            }
        }
        Start-Sleep -Milliseconds 500
    }
    $logs = @((Join-Path $env:APPDATA "$AppId\logs\server.log"), (Join-Path $env:LOCALAPPDATA "$AppId\logs\server.log"))
    throw ("The server did not answer /api/health within $LaunchWaitSec seconds. Server log candidates: " + ($logs -join ' , '))
}

function Wait-Step([string]$Prompt, [string]$Label) {
    $typed = Read-Host "$Prompt (press Enter, or type a short note first)"
    Add-Mark $Label $typed.Trim()
}

$rows = @()
function Build-Rows {
    $defs = @(
        @{ Step = 1; Name = 'Download and install';         From = 0; To = 1; Method = 'auto' },
        @{ Step = 2; Name = 'First launch to healthy server'; From = 1; To = 2; Method = 'auto' },
        @{ Step = 3; Name = 'Muse Code sign-in';            From = 2; To = 3; Method = 'keypress' },
        @{ Step = 4; Name = 'Open project folder';          From = 3; To = 4; Method = 'keypress' },
        @{ Step = 5; Name = 'First prompt to first token';  From = 4; To = 5; Method = 'keypress' }
    )
    $out = @()
    foreach ($d in $defs) {
        if ($marks.Count -gt $d.To) {
            $out += [pscustomobject]@{
                Step      = $d.Step
                Name      = $d.Name
                StartedAt = $marks[$d.From].Iso
                EndedAt   = $marks[$d.To].Iso
                Seconds   = [math]::Round($marks[$d.To].Sec - $marks[$d.From].Sec, 1)
                Method    = $d.Method
                Note      = $marks[$d.To].Note
            }
        }
    }
    if ($marks.Count -eq 6) {
        $out += [pscustomobject]@{
            Step = 'total'; Name = 'Steps 1 to 5'; StartedAt = $marks[0].Iso; EndedAt = $marks[5].Iso
            Seconds = [math]::Round($marks[5].Sec - $marks[0].Sec, 1); Method = ''; Note = ''
        }
    }
    return $out
}

Write-Host ""
Write-Host "Helicon first-run timing" -ForegroundColor Cyan
Write-Host "Results will be saved to: $CsvPath"
Write-Host ""

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if ($principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "WARNING: this window is elevated. Use a normal PowerShell window for a clean run." -ForegroundColor Yellow
}

$existing = Get-HeliconInstall
if ($existing -and -not $AllowExisting) {
    throw "Helicon $($existing.DisplayVersion) is already installed. Use a clean Windows profile, or pass -AllowExisting (the run then is not a clean first run)."
}
if (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) {
    throw "Helicon is already running. Close it, then run this script again."
}

try {
    Read-Host "Press Enter to start the timer (step 1: download and install)" | Out-Null
    Add-Mark 'run start'

    # Step 1
    $installer = $null
    if ($InstallerPath) {
        if (-not (Test-Path $InstallerPath)) { throw "Installer not found: $InstallerPath" }
        $installer = $InstallerPath
    } elseif ($DownloadLatest) {
        $installer = Get-LatestInstaller
    } else {
        Write-Host "Download the newest Helicon_*_x64-setup.exe from https://github.com/$Repo/releases/latest and run it."
        Write-Host "If SmartScreen says 'Windows protected your PC', click More info, then Run anyway."
    }
    if ($installer) { Start-Process -FilePath $installer | Out-Null }
    $installed = Wait-ForInstall
    Add-Mark 'install done' ("version " + $installed.DisplayVersion)

    # Step 2
    Write-Host "Open Helicon from the Start menu now. Timing stops when the server answers."
    $health = Wait-ForHealthy $marks[1].At
    Add-Mark 'server healthy' ("server " + $health.version)

    # Step 3
    Write-Host ""
    Write-Host "Step 3: sign in to Muse Code. If Helicon shows a 'Sign in to Muse' card, use it or run 'muse login' in a terminal."
    Write-Host "Helicon 0.22.2 and older show no card on native Windows. If none shows, press Enter anyway and type 'no card' as the note."
    Wait-Step "Press Enter once Helicon shows you are signed in" 'signed in'

    # Step 4
    Write-Host ""
    Write-Host "Step 4: add a project folder in Helicon. Press Enter when the folder is open."
    Wait-Step "Press Enter when the project folder is open" 'project open'

    # Step 5
    Write-Host ""
    Write-Host "Step 5: send a first prompt. Press Enter when the first streamed reply token shows."
    Wait-Step "Press Enter when the first token shows" 'first token'

    Write-Host ""
    Write-Host "All five steps done." -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host ("STOPPED: " + $_.Exception.Message) -ForegroundColor Red
} finally {
    $rows = Build-Rows
    if ($rows.Count -gt 0) {
        $rows | Format-Table Step, Name, Seconds, Method, Note -AutoSize
        $rows | Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
        Write-Host "Saved: $CsvPath" -ForegroundColor Cyan
        Write-Host "Paste the table, or the CSV contents, back to the person who asked for this run."
    } else {
        Write-Host "No step finished, so no CSV was written."
    }
}

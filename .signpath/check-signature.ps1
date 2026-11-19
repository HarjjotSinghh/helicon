# Fails unless the file carries an intact Authenticode signature. Under the test-signing policy SignPath uses a
# self-signed certificate that Windows does not trust, so an untrusted chain is accepted there and nowhere else; a
# changed file (HashMismatch) or a missing signature always fails.
param([Parameter(Mandatory)][string]$Path)
$ErrorActionPreference = 'Stop'
$s = Get-AuthenticodeSignature -LiteralPath $Path
$s | Format-List Status, StatusMessage, SignerCertificate
if (-not $s.SignerCertificate) { throw "$Path has no Authenticode signature" }
$allowed = @('Valid')
if ($env:SIGNING_POLICY -eq 'test-signing') { $allowed += 'UnknownError', 'NotTrusted' }
if ($allowed -notcontains [string]$s.Status) { throw "$Path signature status is $($s.Status): $($s.StatusMessage)" }

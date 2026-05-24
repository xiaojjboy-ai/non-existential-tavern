$ErrorActionPreference = "Continue"

$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Host "ERROR: not inside a git repository"
    exit 1
}
Set-Location $repoRoot

powershell -ExecutionPolicy Bypass -File ".\harness\policy\guard.ps1" -Stage pre-commit
exit $LASTEXITCODE

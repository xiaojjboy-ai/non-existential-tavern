param(
  [ValidateSet("inspect", "quick", "full")]
  [string]$Stage = "quick"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$HarnessRoot = $PSScriptRoot
$RepoRoot = Split-Path -Parent $HarnessRoot
$WorkspaceRoot = Split-Path -Parent $RepoRoot
$AppRoot = $RepoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Path {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing $Label`: $Path"
  }
  Write-Host "OK $Label`: $Path"
}

function Invoke-AppCommand {
  param([string]$Command)
  Write-Host "RUN $Command"
  Push-Location $AppRoot
  try {
    cmd /c $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code $LASTEXITCODE`: $Command"
    }
  }
  finally {
    Pop-Location
  }
}

Write-Step "Path check"
Assert-Path $WorkspaceRoot "Workspace root"
Assert-Path $RepoRoot "Repo root"
Assert-Path $AppRoot "App root"
Assert-Path (Join-Path $RepoRoot "AGENTS.md") "AGENTS.md"
Assert-Path (Join-Path $HarnessRoot "agent-entry.md") "agent-entry.md"
Assert-Path (Join-Path $HarnessRoot "workflow.md") "workflow.md"
Assert-Path (Join-Path $AppRoot "package.json") "package.json"
Assert-Path (Join-Path $AppRoot "docs/script-format.md") "script-format.md"

Write-Step "Project rules check"
$agents = Get-Content -Raw -Encoding utf8 (Join-Path $RepoRoot "AGENTS.md")
if ($agents -notmatch "agent-entry\.md") {
  throw "AGENTS.md does not mention agent-entry.md"
}
if ($agents -notmatch "harness/agent-entry\.md") {
  throw "AGENTS.md is not wired to Agent Harness entry"
}
Write-Host "OK AGENTS.md is wired to Agent Harness"

if ($Stage -eq "inspect") {
  Write-Step "inspect complete"
  Write-Host "Structure check only. npm commands were not run."
  exit 0
}

Write-Step "Quick gate"
Invoke-AppCommand "npm run compile"
Invoke-AppCommand "npx tsc --noEmit --pretty false"
Invoke-AppCommand "npm run lint"

if ($Stage -eq "full") {
  Write-Step "Full gate"
  Invoke-AppCommand "npm run build"
}

Write-Step "Complete"
Write-Host "Agent Harness check passed: $Stage"

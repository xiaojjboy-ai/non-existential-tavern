# harness/policy/guard.ps1 - Role-based file boundary guard
param(
    [string]$Stage = "inspect"
)

$ErrorActionPreference = "Stop"
# --- Paths ---
$repoRoot = git rev-parse --show-toplevel 2>$null
if (-not $repoRoot) {
    Write-Host "ERROR: not inside a git repository"
    exit 1
}
Set-Location $repoRoot

$roleFile      = "harness/.current-role"
$rolesJsonFile = "harness/roles.json"
$taskJsonFile  = "harness/current-task.json"

# --- Read current role ---
if (-not (Test-Path $roleFile)) {
    Write-Host "ERROR: no role set. Run: .\h <role>"
    exit 1
}
$currentRole = (Get-Content $roleFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($currentRole)) {
    Write-Host "ERROR: role file is empty. Run: .\h <role>"
    exit 1
}

# --- Read roles.json ---
if (-not (Test-Path $rolesJsonFile)) {
    Write-Host "ERROR: $rolesJsonFile not found"
    exit 1
}
$rolesData = [System.IO.File]::ReadAllText((Resolve-Path $rolesJsonFile), [System.Text.Encoding]::UTF8) | ConvertFrom-Json
$roleDef = $rolesData.roles.$currentRole
if (-not $roleDef) {
    Write-Host "ERROR: unknown role '$currentRole' in $rolesJsonFile"
    exit 1
}

# --- Read task extra constraints ---
$extraAllowed = @()
$extraForbidden = @()
$taskId = "(none)"
if (Test-Path $taskJsonFile) {
    $taskData = [System.IO.File]::ReadAllText((Resolve-Path $taskJsonFile), [System.Text.Encoding]::UTF8) | ConvertFrom-Json
    $taskId = $taskData.id
    if ($taskData.extra_allowed) { $extraAllowed = @($taskData.extra_allowed) }
    if ($taskData.extra_forbidden) { $extraForbidden = @($taskData.extra_forbidden) }
}

# --- Build boundary lists ---
$allowed   = @($roleDef.allowed) + $extraAllowed
$forbidden = @($roleDef.forbidden) + $extraForbidden

# --- Glob matching function ---
function Test-GlobMatch {
    param([string]$Path, [string]$Pattern)
    
    # Normalize separators
    $Path = $Path -replace '\\', '/'
    $Pattern = $Pattern -replace '\\', '/'
    
    # Convert glob to regex
    $regex = '^'
    $i = 0
    while ($i -lt $Pattern.Length) {
        $c = $Pattern[$i]
        if ($c -eq '*') {
            if (($i + 1) -lt $Pattern.Length -and $Pattern[$i + 1] -eq '*') {
                # ** matches any path segments
                if (($i + 2) -lt $Pattern.Length -and $Pattern[$i + 2] -eq '/') {
                    $regex += '(.+/)?'
                    $i += 3
                    continue
                } else {
                    $regex += '.*'
                    $i += 2
                    continue
                }
            } else {
                # * matches anything except /
                $regex += '[^/]*'
                $i++
                continue
            }
        } elseif ($c -eq '?') {
            $regex += '[^/]'
        } elseif ($c -eq '.') {
            $regex += '\.'
        } elseif ($c -eq '/') {
            $regex += '/'
        } else {
            $regex += [regex]::Escape([string]$c)
        }
        $i++
    }
    $regex += '$'
    
    return $Path -match $regex
}

function Test-AnyGlobMatch {
    param([string]$Path, [array]$Patterns)
    foreach ($p in $Patterns) {
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        if (Test-GlobMatch -Path $Path -Pattern $p) { return $true }
    }
    return $false
}

# --- Get changed files ---
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"
if ($Stage -eq "pre-commit") {
    $files = @(git diff --cached --name-only 2>$null) | Where-Object { $_ }
} else {
    $staged    = @(git diff --cached --name-only 2>$null) | Where-Object { $_ }
    $unstaged  = @(git diff --name-only 2>$null) | Where-Object { $_ }
    $untracked = @(git ls-files --others --exclude-standard 2>$null) | Where-Object { $_ }
    $files = ($staged + $unstaged + $untracked) | Sort-Object -Unique
}
$ErrorActionPreference = $prevEAP

# --- Admin bypass ---
if ($currentRole -eq "admin") {
    Write-Host "OK role=admin task=$taskId ($($files.Count) files changed)"
    exit 0
}

# --- Boundary check ---
$violations = @()
foreach ($f in $files) {
    $f = $f -replace '\\', '/'
    
    # Forbidden takes priority
    if (Test-AnyGlobMatch -Path $f -Patterns $forbidden) {
        $violations += "FORBIDDEN: $currentRole cannot modify $f"
        continue
    }
    
    # Must be in allowed
    if (-not (Test-AnyGlobMatch -Path $f -Patterns $allowed)) {
        $violations += "OUT_OF_BOUND: $currentRole cannot modify $f"
    }
}

if ($violations.Count -gt 0) {
    foreach ($v in $violations) {
        Write-Host $v
    }
    Write-Host ""
    Write-Host "FAILED: $($violations.Count) boundary violation(s) for role=$currentRole task=$taskId"
    if ($Stage -eq "agent-hook") { exit 2 } else { exit 1 }
}

Write-Host "OK role=$currentRole task=$taskId ($($files.Count) files checked)"
exit 0

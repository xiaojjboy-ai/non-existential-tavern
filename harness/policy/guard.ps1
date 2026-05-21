param(
  [ValidateSet("inspect", "pre-commit", "pre-stop", "ci")]
  [string]$Stage = "inspect"
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$PolicyRoot = $PSScriptRoot
$HarnessRoot = Split-Path -Parent $PolicyRoot
$RepoRoot = Split-Path -Parent $HarnessRoot
$WorkspaceRoot = Split-Path -Parent $RepoRoot
$AppRoot = $RepoRoot
$TaskPath = Join-Path $HarnessRoot "current-task.json"
$ClaimsPath = Join-Path $HarnessRoot "claims.json"
$EvidenceRoot = Join-Path $HarnessRoot "evidence"
$WorkRecordsRoot = Join-Path $HarnessRoot "work-records"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Resolve-RepoPath {
  param([string]$RelativePath)
  return Join-Path $RepoRoot $RelativePath
}

function Write-DrillFailure {
  param(
    [string]$Code,
    [string]$Conclusion,
    [string]$Fact,
    [string]$Qualitative,
    [string[]]$Remedies
  )

  $remedyList = @()
  for ($i = 0; $i -lt $Remedies.Length; $i++) {
    $remedyList += "$($i + 1). $($Remedies[$i])"
  }

  Write-Host ""
  Write-Host "==================================================" -ForegroundColor Red
  Write-Host "停。$Conclusion" -ForegroundColor Red
  Write-Host ""
  Write-Host "问题：" -ForegroundColor Yellow
  Write-Host $Fact -ForegroundColor Yellow
  Write-Host ""
  Write-Host "性质：" -ForegroundColor Yellow
  Write-Host $Qualitative -ForegroundColor Yellow
  Write-Host ""
  Write-Host "处理：" -ForegroundColor Yellow
  foreach ($line in $remedyList) {
    Write-Host $line -ForegroundColor Yellow
  }
  Write-Host ""
  Write-Host "门禁：" -ForegroundColor Red
  Write-Host "你没有通过检查，就没有资格说完成。" -ForegroundColor Red
  Write-Host "没有 evidence，就没有完成。" -ForegroundColor Red
  Write-Host "guard 不绿，不准交付。" -ForegroundColor Red
  Write-Host "==================================================" -ForegroundColor Red
  throw "$Code`: $Fact"
}

function Fail-Hard {
  param(
    [string]$Code,
    [string]$Message,
    [string]$Fix,
    [string[]]$Items = @()
  )

  $itemText = if ($Items.Count -gt 0) { $Items -join ", " } else { $Message }

  switch ($Code) {
    "missing-evidence" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "你没有完成。" `
        -Fact "在指定的 evidence 目录下未找到任何能证明你工作过的日志或截图：$itemText" `
        -Qualitative "没有 evidence，就没有完成。口头汇报能算交付？你的代码是写在空气里的吗？" `
        -Remedies @(
          "立刻滚去运行本地验证脚本，严禁盲交！",
          "将完整的验证日志或执行截图老老实实放入指定的 evidence 目录！",
          "重新运行 guard.ps1，拿不出铁证就别想让我多看一眼！"
        )
    }
    "missing-work-record" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "你没有留档。" `
        -Fact "没有找到当前任务的工作记录：$itemText" `
        -Qualitative "改了什么不入档，就是把风险留给下一个人。工作记录不是装饰，是交接底线。" `
        -Remedies @(
          "立刻在 harness/work-records/ 下补当前任务记录。",
          "写清楚修改范围、验证命令、证据路径和遗留风险。",
          "重新运行 pre-stop。没留档，不准收工。"
        )
    }
    "out-of-scope-file" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "你越界了。" `
        -Fact "检测到你私自修改了未被授权的文件：$itemText" `
        -Qualitative "任务边界不是装饰！擅自跨界就是严重违规，你以为这是你家后花园？" `
        -Remedies @(
          "立刻使用 git checkout 撤销在授权范围之外所做的任何文件修改，一个字符都不许留！",
          "如果确有必要修改，立刻去 current-task.json 把权限加回来！",
          "重新接受门禁检查，管好你的手，别乱碰别的文件！"
        )
    }
    "forbidden-file" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "你碰了禁区。" `
        -Fact "检测到你修改了 forbidden_files 中的文件：$itemText" `
        -Qualitative "禁改文件不是提醒，是红线。碰到红线，就必须先纠正现场。" `
        -Remedies @(
          "立刻停止当前操作。",
          "撤回禁改文件上的改动，或者重新开任务票据说明授权原因。",
          "重新接受门禁检查。禁区没清干净，不准往下走。"
        )
    }
    "generated-file" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "这个动作必须纠正。" `
        -Fact "检测到你直接动手修改了由工具自动生成的产物文件：$itemText" `
        -Qualitative "生成物不是源头！你在这动手，下次自动构建就全被覆盖了，你是在给项目埋雷！" `
        -Remedies @(
          "立刻把对生成物的所有脏改动全部回滚！",
          "滚回你的源头模板或源脚本去修改！",
          "重新运行构建生成命令，别耍小聪明！"
        )
    }
    "command-failed" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "检查失败。" `
        -Fact "在执行 $Stage 阶段时，命令 [$itemText] 报错崩溃，返回了非零退出码。" `
        -Qualitative "失败的命令没有被修复，就不能继续包装进度！掩耳盗铃很有意思吗？" `
        -Remedies @(
          "睁大眼睛看清楚报错日志，定位到具体的出错行，停止掩耳盗铃！",
          "在本地老老实实把这个 Bug 给我彻底修了！",
          "确保该测试命令在本地可以成功跑出绝对绿码！"
        )
    }
    "missing-file" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "你没有开工资格。" `
        -Fact "当前工作区连个必需文件都没配置好：$itemText。你在瞎忙活什么？" `
        -Qualitative "任务票据没过，不准开工！没有票据你就是个黑户，没人承认你的任何工作！" `
        -Remedies @(
          "立刻去根目录老老实实配置好 current-task.json 票据！",
          "确保配置项全部正确且处于激活状态，少一项都不行！",
          "重新运行 guard.ps1。票据不过，不准开工！"
        )
    }
    "bad-json" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "任务配置不合格。" `
        -Fact "JSON 文件无法解析：$itemText" `
        -Qualitative "坏 JSON 会让门禁失明。门禁读不懂票据，任何执行都无效。" `
        -Remedies @(
          "修正 JSON 语法。",
          "不要写注释，不要留尾逗号。",
          "重新运行 guard.ps1，直到任务票据能被正常读取。"
        )
    }
    "bad-task-ticket" {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "任务票据不合格。" `
        -Fact $Message `
        -Qualitative "任务票据不是摆设。边界、证据和检查没写清楚，就不准开工。" `
        -Remedies @(
          "补齐 current-task.json 缺失字段。",
          "明确 allowed_files、forbidden_files、required_checks 和 required_evidence。",
          "重新运行 inspect。票据不过，不准进入实现。"
        )
    }
    default {
      Write-DrillFailure `
        -Code $Code `
        -Conclusion "这一步不合格。" `
        -Fact $Message `
        -Qualitative "guard 已经拦截。不要解释，先处理事实。" `
        -Remedies @(
          $Fix,
          "重新运行 guard.ps1。",
          "guard 不绿，不准交付。"
        )
    }
  }
}

function Assert-File {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) {
    Fail-Hard "missing-file" "$Label is missing at $Path" "Create or restore the required file, then rerun guard." @("$Label -> $Path")
  }
  Write-Host "OK $Label"
}

function Read-JsonFile {
  param([string]$Path, [string]$Label)
  Assert-File $Path $Label
  try {
    return Get-Content -Raw -Encoding utf8 $Path | ConvertFrom-Json
  }
  catch {
    Fail-Hard "bad-json" "$Label is not valid JSON: $Path" "Fix the JSON syntax. No trailing commas. No comments." @($Path)
  }
}

function Convert-GlobToRegex {
  param([string]$Pattern)
  $escaped = [Regex]::Escape($Pattern)
  $escaped = $escaped.Replace("\*\*", ".*")
  $escaped = $escaped.Replace("\*", "[^/\\]*")
  return "^$escaped$"
}

function Test-PatternList {
  param([string]$Path, $Patterns)
  $normalized = $Path.Replace("\", "/")
  foreach ($pattern in $Patterns) {
    $regex = Convert-GlobToRegex $pattern
    if ($normalized -match $regex) {
      return $true
    }
  }
  return $false
}

function Get-ChangedFiles {
  $files = @()

  Push-Location $RepoRoot
  try {
    $repoOutput = cmd /c "git status --short --untracked-files=all 2>NUL"
    $repoFiles = $repoOutput | ForEach-Object {
      if ($_ -match "^\s*(?:[MADRCU?!]{1,2})\s+(.+)$") {
        $p = $Matches[1].Trim()
        if ($p -match " -> ") {
          $p = ($p -split " -> ")[1]
        }
        if ($p -notmatch "^tavern-web/") {
          $p.Replace("\", "/")
        }
      }
    }
    $files += $repoFiles
  }
  catch {
    # Repo root may not be a git repository in this project layout. App root is checked below.
  }
  finally {
    Pop-Location
  }

  return @($files | Where-Object { $_ } | Sort-Object -Unique)
}

function Assert-TaskShape {
  param($Task)
  foreach ($field in @("id", "title", "owner", "allowed_files", "forbidden_files", "required_reads", "required_checks", "required_evidence")) {
    if (-not $Task.PSObject.Properties.Name.Contains($field)) {
      Fail-Hard "bad-task-ticket" "current-task.json is missing '$field'." "Fill the task ticket before doing work."
    }
  }
  if ($Task.allowed_files.Count -lt 1) {
    Fail-Hard "bad-task-ticket" "allowed_files is empty." "Declare the files or folders this task is allowed to touch."
  }
}

function Assert-RequiredReads {
  param($Task)
  foreach ($item in $Task.required_reads) {
    $path = Resolve-RepoPath $item
    Assert-File $path "required read: $item"
  }
}

function Assert-FileBoundaries {
  param($Task)
  $changed = Get-ChangedFiles
  if ($changed.Count -eq 0) {
    Write-Host "OK no tracked app changes detected"
    return
  }

  $ignored = @()
  if ($Task.PSObject.Properties.Name.Contains("ignored_existing_changes")) {
    $ignored = @($Task.ignored_existing_changes)
  }

  foreach ($file in $changed) {
    if (Test-PatternList $file $ignored) {
      Write-Host "IGNORED existing change: $file"
      continue
    }
    if (Test-PatternList $file $Task.forbidden_files) {
      Fail-Hard "forbidden-file" "$file is forbidden for this task." "Revert or move that change into a task that explicitly allows it." @($file)
    }
    if (-not (Test-PatternList $file $Task.allowed_files)) {
      Fail-Hard "out-of-scope-file" "$file is outside allowed_files." "Stop wandering. Update the task ticket or remove the unrelated change." @($file)
    }
  }
  Write-Host "OK changed files are inside task boundaries"
}

function Assert-GeneratedFiles {
  param($Task)
  if ($Task.allow_generated -eq $true) {
    Write-Host "OK generated files are allowed by task ticket"
    return
  }

  $changed = Get-ChangedFiles
  foreach ($file in $changed) {
    if ($file -eq "src/data/plot-data.json") {
      Fail-Hard "generated-file" "plot-data.json changed while allow_generated is false." "Do not hand-edit generated data. Change scripts or compiler, then run npm run compile." @($file)
    }
  }
  Write-Host "OK generated file policy"
}

function Assert-Evidence {
  param($Task)
  foreach ($item in $Task.required_evidence) {
    $path = Resolve-RepoPath $item
    if (-not (Test-Path -LiteralPath $path)) {
      Fail-Hard "missing-evidence" "Required evidence is missing: $item" "Run the required checks and save proof before claiming completion." @($item)
    }
  }
  Write-Host "OK required evidence exists"
}

function Assert-WorkRecord {
  param($Task)
  $recordPath = Join-Path $WorkRecordsRoot "$($Task.id).md"
  if (-not (Test-Path -LiteralPath $recordPath)) {
    Fail-Hard "missing-work-record" "Work record is missing for task $($Task.id)" "Create harness/work-records/$($Task.id).md before claiming completion." @("harness/work-records/$($Task.id).md")
  }
  Write-Host "OK work record exists"
}

function Write-InspectEvidence {
  param($Task)
  if (-not (Test-Path -LiteralPath $EvidenceRoot)) {
    New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null
  }
  $path = Join-Path $EvidenceRoot "$($Task.id)-inspect.txt"
  $content = @(
    "Agent Harness inspect passed",
    "task=$($Task.id)",
    "owner=$($Task.owner)",
    "stage=$Stage",
    "time=$(Get-Date -Format o)"
  )
  Set-Content -LiteralPath $path -Encoding utf8 -Value $content
  Write-Host "OK wrote inspect evidence: $path"
}

function Invoke-AppCommand {
  param([string]$Command)
  Write-Host "RUN $Command"
  Push-Location $AppRoot
  try {
    cmd /c $Command
    if ($LASTEXITCODE -ne 0) {
      Fail-Hard "command-failed" "$Command failed with exit code $LASTEXITCODE." "Read the output, fix the real error, and rerun the command." @("$Command exited with $LASTEXITCODE")
    }
  }
  finally {
    Pop-Location
  }
}

Write-Step "Load task and claims"
$task = Read-JsonFile $TaskPath "current-task.json"
$claims = Read-JsonFile $ClaimsPath "claims.json"
Assert-TaskShape $task
Write-Host "OK task: $($task.id) / $($task.title)"
Write-Host "OK claims version: $($claims.version)"

Write-Step "Required reads"
Assert-RequiredReads $task

Write-Step "Path boundaries"
Assert-FileBoundaries $task
Assert-GeneratedFiles $task

if ($Stage -eq "inspect") {
  Write-Step "Inspect evidence"
  Write-InspectEvidence $task
  Write-Step "Guard passed"
  Write-Host "Agent Harness passed inspect. Now work inside the task boundaries."
  exit 0
}

if ($Stage -eq "pre-commit") {
  Write-Step "Pre-commit passed"
  Write-Host "File boundaries are clean. You may commit if your task checks are done."
  exit 0
}

if ($Stage -eq "pre-stop") {
  Write-Step "Evidence gate"
  Assert-Evidence $task
  Assert-WorkRecord $task
  if ($task.handoff_required -eq $true) {
    Assert-File (Join-Path $HarnessRoot "handoff.md") "handoff.md"
  }
  Write-Step "Guard passed"
  Write-Host "Pre-stop passed. You may now report completion."
  exit 0
}

if ($Stage -eq "ci") {
  Write-Step "CI gate"
  Invoke-AppCommand "npm run compile"
  Invoke-AppCommand "npx tsc --noEmit --pretty false"
  Invoke-AppCommand "npm run lint"
  Invoke-AppCommand "npm run build"
  Assert-Evidence $task
  Write-Step "Guard passed"
  Write-Host "CI passed. This task has evidence and build gates."
  exit 0
}

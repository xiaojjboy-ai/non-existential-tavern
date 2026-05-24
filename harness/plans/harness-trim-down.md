# Plan: harness-trim-down

## 目标

把 harness 从“生命周期审计系统”砍成项目内真正需要的三件事：

1. **角色边界**：不同角色只能提交自己负责的文件。
2. **项目 Hook 防误改**：Agent hook 防上下文压缩后失忆，Git hook 防越界提交。
3. **简单留档**：按角色分目录记录哪个人类负责、用了哪个 Agent、实际改了什么。

明确砍掉：session 隔离、evidence 自动生成、flow、report、pre-stop、required_* 校验、handoff、protocols、claims、多份重复说明文档。

## 设计原则

1. **机制只解决真实问题**：不做审计大楼，不做交付仪式。
2. **真相源唯一**：角色边界只写在 `harness/roles.json`。
3. **Agent hook 防失忆**：上下文压缩、恢复或工具调用前，重新读取本项目规则。
4. **Git hook 防误提交**：只限制本项目提交，不做验证、不做留证据。
5. **留档是流水账**：records 只记录人类负责人、Agent 工具、改了什么、怎么验证。

## 角色定义

三个角色：

- `admin`：项目管理、harness 规则、全局配置。基本全开。
- `developer`：程序开发。可改应用代码、编译器、工具、资源、技术文档，以及自己的计划/留档；不能改剧情、角色设定和门禁规则。
- `planner`：剧情策划。可改剧情、角色资料、设定文档，以及自己的计划/留档；不能改代码、工具、门禁和项目配置。

边界存到 `harness/roles.json`，Agent hook、Git hook 和 `guard.ps1` 都读这一份。

## 角色边界

### admin

```json
{
  "allowed": ["**"],
  "forbidden": []
}
```

### developer

developer 不能改整个 `harness/**`，只能改自己的留档和计划。

```json
{
  "allowed": [
    "src/**",
    "scripts/**",
    "tools/**",
    "public/**",
    "docs/**",
    "harness/plans/**",
    "harness/records/developer/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "README.md"
  ],
  "forbidden": [
    "脚本/**",
    "docs/characters/**",
    "harness/policy/**",
    "harness/roles.json",
    "harness/current-task.json",
    "harness/.current-role",
    "harness/records/admin/**",
    "harness/records/planner/**",
    "AGENTS.md",
    "h.bat"
  ]
}
```

### planner

planner 用文件夹级边界，不列散碎文件。

```json
{
  "allowed": [
    "脚本/**",
    "docs/**",
    "harness/plans/**",
    "harness/records/planner/**"
  ],
  "forbidden": [
    "src/**",
    "scripts/**",
    "tools/**",
    "public/**",
    "harness/policy/**",
    "harness/roles.json",
    "harness/current-task.json",
    "harness/.current-role",
    "harness/records/admin/**",
    "harness/records/developer/**",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "*.config.*",
    "AGENTS.md",
    ".gitignore",
    "h.bat"
  ]
}
```

规则：`forbidden` 优先级高于 `allowed`。例如 developer 虽然允许 `docs/**`，但仍不能改 `docs/characters/**`。

## Agent Hook：上下文恢复防失忆

Agent hook 保留，但只做轻量边界恢复。

它不是交付流程，不跑 `flow`，不写 evidence，不做 report，不检查 work-record。

统一命令：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage agent-hook
```

`agent-hook` 做同一套极简检查：

1. 读 `harness/.current-role`
2. 读 `harness/roles.json`
3. 读 `harness/current-task.json`
4. 扫当前 git 改动
5. 发现越界就失败

成功输出保持极短：

```text
OK role=developer task=harness-trim-down
```

失败示例：

```text
FORBIDDEN: planner cannot modify src/app/page.tsx
```

### 各 Agent 接入点

只在 README 写接入示例，不把这些工具配置塞进核心逻辑。

- Claude Code：`PreCompact`、`SessionStart: compact/resume`、`PreToolUse`
- Cursor：`SessionStart`、`PreToolUse`
- Kilo Code：`.kilo/plugin/`，`experimental.session.compacting`
- Antigravity / agy：`.agents/hooks.json`，`PreToolUse`
- OpenCode：`.opencode/plugins/`，`experimental.session.compacting`、`session.compacted`、`tool.execute.before`
- Codex：如果当前版本支持项目 hook，则接上下文压缩/恢复或 `PreToolUse`；否则依赖 `AGENTS.md` + Git hook

## Git Hook：项目提交硬墙

Git hook 保留，但定位只是一句话：

> 本项目提交前，按当前角色拦越界文件。

它不做审计、不做验证、不做证据、不判断任务完成。

入库模板：

- `harness/hooks/pre-commit`
- `harness/hooks/pre-commit.ps1`
- `harness/hooks/README.md`

安装命令：

```powershell
.\h install-hooks
```

安装结果：

```text
harness/hooks/pre-commit -> .git/hooks/pre-commit
```

`.git/hooks/` 不进 git，所以不能直接把它当项目文件管理。

### 教 Agent 安装 Hook 的文件

不直接修改项目根流程前，先把安装说明设计进计划。落地时新增：

```text
harness/hooks/
  pre-commit
  pre-commit.ps1
  README.md
```

`harness/hooks/README.md` 用来教 Agent 和人类安装本项目 hook，内容只保留最小说明：

```md
# Project Hooks

本目录保存可入库的 hook 模板。`.git/hooks/` 是本机目录，不会随 git clone 同步。

## 安装

在项目根目录运行：

```powershell
.\h install-hooks
```

安装后会复制：

```text
harness/hooks/pre-commit -> .git/hooks/pre-commit
```

## 作用

pre-commit 只做一件事：

> 提交前按当前角色检查文件边界，防止 planner 提交代码、developer 提交剧情或任何角色越过门禁。

它不做测试、不做 evidence、不做 flow、不判断任务完成。

## 检查

```powershell
.\h doctor
```

应看到 Git hook 已安装。
```

`harness/hooks/pre-commit` 作为 Git 调用入口：

```sh
#!/bin/sh
if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File ./harness/hooks/pre-commit.ps1
else
  powershell -ExecutionPolicy Bypass -File ./harness/hooks/pre-commit.ps1
fi
exit $?
```

`harness/hooks/pre-commit.ps1` 只调用 guard：

```powershell
$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

powershell -ExecutionPolicy Bypass -File ".\harness\policy\guard.ps1" -Stage pre-commit
exit $LASTEXITCODE
```

`h.bat` 后续只需要补两个命令：

```bat
if "%arg1%"=="install-hooks" (
    if not exist ".git\hooks" mkdir ".git\hooks"
    copy /Y "harness\hooks\pre-commit" ".git\hooks\pre-commit" >nul
    echo installed: .git/hooks/pre-commit
    goto end
)

if "%arg1%"=="doctor" (
    echo Current role:
    type "harness\.current-role" 2>nul || echo (none)
    if exist ".git\hooks\pre-commit" (
        echo OK git hook installed
    ) else (
        echo MISSING git hook: run .\h install-hooks
    )
    goto end
)
```

## 关键产物

### `harness/roles.json`

角色边界唯一真相源。内容采用上面的角色边界。

### `harness/current-task.json`

极简任务票：

```json
{
  "id": "harness-trim-down",
  "title": "把 harness 砍成角色+边界+简单留档",
  "role": "admin",
  "extra_allowed": [],
  "extra_forbidden": []
}
```

`guard.ps1` 要检查：当前 `harness/.current-role` 必须等于 `current-task.json.role`，除非当前角色是 `admin`。

### `harness/.current-role`

本机当前身份，一行字：

```text
admin
```

该文件必须 gitignore。

### `harness/records/_template.md`

```md
# <task-id>

**人类负责人**：<姓名/昵称/Git 用户名>
**角色**：<admin|developer|planner>
**Agent 工具**：<Codex / Claude / Cursor / Kilo / Antigravity / OpenCode / 无>
**接任务**：YYYY-MM-DD — 一句话意图
**完成**：YYYY-MM-DD — 一句话结果

## 改了什么

-

## 怎么验证

-
```

records 目录结构：

```text
harness/records/
  _template.md
  admin/
  developer/
  planner/
```

旧记录迁移，不直接丢：

```text
harness/work-records/harness-runtime-enforcement.md -> harness/records/admin/harness-runtime-enforcement.md
harness/work-records/harness-setup.md -> harness/records/admin/harness-setup.md
```

### `harness/policy/guard.ps1`

极简职责：

1. 读当前角色。
2. 读角色边界。
3. 合并任务额外边界。
4. 扫 git 改动文件，包括 staged、unstaged、untracked。
5. 对每个文件按 forbidden 优先、allowed 次之进行检查。

Stage 保留兼容：

- `inspect`
- `agent-hook`
- `pre-commit`
- 其他旧 stage 可以兼容成同一套边界检查，或提示已废弃。

砍掉：

- session 状态
- evidence 写入
- report
- pre-stop
- flow
- required_reads / required_checks / required_evidence
- Sync-PlanSteps

### `h.bat`

支持：

```powershell
.\h admin
.\h developer
.\h planner
.\h install-hooks
.\h doctor
```

行为：

- `.\h <role>`：写 `harness/.current-role`，立刻跑 `guard.ps1 -Stage inspect`
- `.\h install-hooks`：安装本项目 Git hook
- `.\h doctor`：检查 `.current-role`、`roles.json`、`guard.ps1`、Git hook 是否就绪
- `.\h`：显示当前 role 和可用命令

## 修改范围

会修改：

- `harness/roles.json`（新增）
- `harness/current-task.json`（瘦身）
- `harness/.current-role`（新增，本地文件，gitignore）
- `harness/policy/guard.ps1`（重写为极简边界检查）
- `harness/hooks/pre-commit`（新增，Git hook 模板）
- `harness/hooks/pre-commit.ps1`（新增，真正调用 guard）
- `harness/records/`（新增按角色留档目录）
- `harness/records/_template.md`
- `harness/records/admin/harness-trim-down.md`
- `harness/README.md`（唯一入口文档）
- `harness/.gitignore`
- `AGENTS.md`
- `h.bat`

会迁移：

- `harness/work-records/harness-runtime-enforcement.md` -> `harness/records/admin/harness-runtime-enforcement.md`
- `harness/work-records/harness-setup.md` -> `harness/records/admin/harness-setup.md`

会删除：

- `harness/sessions/`
- `harness/evidence/`
- `harness/work-records/`（迁移后删除）
- `harness/handoff.md`
- `harness/agent-entry.md`
- `harness/workflow.md`
- `harness/protocols/`
- `harness/templates/`
- `harness/claims.json`
- `harness/check.ps1`
- `harness/harness-runs/`

不会修改：

- `脚本/**`
- `docs/**`
- `src/**`
- `public/**`
- `scripts/**`
- `tools/**`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `node_modules/**`

## 步骤

1. 切任务：把 `current-task.json` 改成 `harness-trim-down`，role=`admin`。
2. 新增 `harness/roles.json`。
3. 新增 `harness/records/{admin,developer,planner}/` 和 `_template.md`。
4. 迁移旧 work-record 到 `records/admin/`。
5. 重写 `guard.ps1` 为极简边界检查。
6. 改写 `h.bat`，支持 role、install-hooks、doctor。
7. 新增 `harness/hooks/pre-commit` 和 `pre-commit.ps1`。
8. 重写 `harness/README.md` 为唯一入口文档，包含 Agent hook、Git hook、records 说明。
9. 精简 `AGENTS.md`，只保留项目进入规则和重要项目背景索引。
10. 更新 `.gitignore` 和 `harness/.gitignore`。
11. 删除冗余旧目录和旧文档。
12. 写 `harness/records/admin/harness-trim-down.md`。
13. 跑边界验证和 hook 安装验证。

## 验证

边界规则：

```powershell
# planner 越界改源码，应被拒
.\h planner
echo "test" > src/planner-test.tmp
git add src/planner-test.tmp
powershell -ExecutionPolicy Bypass -File harness/policy/guard.ps1 -Stage pre-commit

# developer 越界改剧情，应被拒
.\h developer
echo "test" > 脚本/developer-test.md
git add 脚本/developer-test.md
powershell -ExecutionPolicy Bypass -File harness/policy/guard.ps1 -Stage pre-commit

# admin 全开，应通过
.\h admin
powershell -ExecutionPolicy Bypass -File harness/policy/guard.ps1 -Stage inspect
```

Git hook：

```powershell
.\h install-hooks
.\h planner
echo "x" > src/git-hook-test.tmp
git add src/git-hook-test.tmp
git commit -m "should fail"
```

期望：pre-commit hook 拒绝提交。

Agent hook：

```powershell
.\h planner
powershell -ExecutionPolicy Bypass -File harness/policy/guard.ps1 -Stage agent-hook
```

期望：输出当前 role/task，发现越界改动时失败。

项目代码不动，但瘦身后跑一次基础检查：

```powershell
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run lint
cmd /c npm run build
```

## 风险

1. **删除范围大**：旧 evidence 会删除；旧 work-record 先迁移再删。
2. **本地 Git hook 不会随 clone 自动安装**：用 `.\h install-hooks` 解决。
3. **跨平台 hook**：先提供 `pre-commit` sh wrapper + `pre-commit.ps1`。Windows 优先，Mac/Linux 需要 `pwsh`。
4. **glob 匹配要写准**：必须支持 `**`、`*`、根目录文件和中文路径。
5. **AGENTS.md 瘦身别丢项目背景**：把 Repository shape、Script format、Build/data flow、Runtime wiring 的索引保留到 README 或 AGENTS。

## 最终形态

```text
harness/
  roles.json
  current-task.json
  .current-role        # gitignored
  README.md
  policy/
    guard.ps1
  hooks/
    pre-commit
    pre-commit.ps1
  records/
    _template.md
    admin/
    developer/
    planner/
```

一句话：

> Agent hook 防上下文压缩后失忆，Git hook 防越界提交，records 留人类流水账。

# Harness

角色边界 + 项目 Hook + 简单留档。

## 快速上手

```powershell
# 1. 认领身份
.\h admin          # 或 developer / planner

# 2. 安装 Git hook（首次克隆后跑一次）
.\h install-hooks

# 3. 自检
.\h doctor
```

## 角色

| 角色 | 可改 | 不可改 |
|------|------|--------|
| admin | 全部 | — |
| developer | src/ scripts/ tools/ public/ docs/ 配置文件 | 脚本/ docs/characters/ harness/policy/ |
| planner | 脚本/ docs/ | src/ scripts/ tools/ public/ 配置文件 |

完整边界定义在 `roles.json`。规则：`forbidden` 优先级高于 `allowed`。

## 机制

### 1. Agent Hook（防上下文压缩后失忆）

Agent 工具在上下文压缩、恢复或工具调用前，调用：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage agent-hook
```

各 Agent 工具已配置硬 hook（配置文件已提交入 git）：

| 工具 | 配置文件 | 触发事件 |
|------|---------|---------|
| Claude Code | `.claude/settings.json` | PostCompact / SessionStart / PreToolUse |
| Codex CLI | `.codex/hooks.json` | PostCompact / SessionStart / PreToolUse |
| Devin (Windsurf) | `.devin/hooks.v1.json` | PostCompaction / SessionStart / PreToolUse |
| Cursor | `.cursor/rules/harness.mdc` | (无硬 hook，靠 rules + Git hook 兜底) |

详见 `harness/agent-onboarding.md`。

### 2. Git Hook（防越界提交）

`harness/hooks/pre-commit` 在提交前按当前角色拦越界文件。

安装：`.\h install-hooks`

它不做测试、不做 evidence、不判断任务完成。

### 3. Records（简单留档）

按角色分目录：

```
harness/records/
  admin/<task-id>.md
  developer/<task-id>.md
  planner/<task-id>.md
```

模板见 `records/_template.md`。留档节点：

- **接任务时**：创建文件，填意图
- **交付时**：补完成项和验证

## guard.ps1

极简职责：

1. 读 `harness/.current-role`
2. 读 `harness/roles.json`
3. 合并 `harness/current-task.json` 的 `extra_allowed` / `extra_forbidden`
4. 扫 git 改动
5. forbidden 优先拒 → allowed 次之拒 → 通过

Stage 参数：`inspect` / `agent-hook` / `pre-commit`（逻辑相同，pre-commit 只看 staged）。

## current-task.json

```json
{
  "id": "task-id",
  "title": "...",
  "role": "admin",
  "extra_allowed": [],
  "extra_forbidden": []
}
```

用于任务级别的额外边界收紧/追加。

## h.bat 命令

| 命令 | 作用 |
|------|------|
| `.\h <role>` | 写身份 + 跑 inspect |
| `.\h install-hooks` | 安装 Git pre-commit hook |
| `.\h doctor` | 自检 role/roles.json/guard/hook 是否就绪 |
| `.\h` | 显示用法和当前 role |

# Harness

角色边界 + Git Hook + 简单留档。

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

## 防线

### 唯一的硬防线：Git pre-commit hook

`harness/hooks/pre-commit` 在 `git commit` 时按当前角色拦截越界文件。**这是唯一一道对所有工具、所有 Agent 都有效的物理屏障。**

安装：`.\h install-hooks`

它只管文件边界，不做测试、不做 evidence、不判断任务完成。

### 软约束：AGENTS.md + 工具规则

AGENTS.md 是 always-on 规则，大多数 Agent 工具会自动加载。它告诉 Agent 先跑 `.\h <role>` 认领身份、遵守边界。但这是靠 Agent 自觉——如果 Agent 无视规则，AGENTS.md 拦不住任何东西。

`.cursor/rules/harness.mdc` 对 Cursor 起同样的软约束作用。

### 工具专属 Hook 配置（不是通用基础设施）

仓库里提交了几份工具专属的 hook 配置文件。**它们只对对应的工具生效**：

| 配置文件 | 仅对谁生效 | 说明 |
|---------|-----------|------|
| `.claude/settings.json` | Claude Code | SessionStart / PostCompact / PreToolUse 时跑 guard |
| `.codex/hooks.json` | Codex CLI | 同上 |
| `.devin/hooks.v1.json` | Devin for Terminal | 同上 |

**如果你不是上面列出的工具，这些配置文件对你没有任何效果。** 不要因为看到这些文件就以为自己会被底层拦截——你的运行环境是否支持读取并执行这些 hook，取决于你自己的工具框架，而不是这些文件的存在。

不认识这些配置的 Agent（如 Antigravity、OpenCode、通用 LLM 客户端等），实际防线只有两道：AGENTS.md 软约束 + Git pre-commit hook 硬拦截。

详细的工具对照见 `harness/agent-onboarding.md`。

### Records（简单留档）

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
4. 扫 git 改动（`inspect`/`agent-hook` 看全部，`pre-commit` 只看 staged）
5. forbidden 优先拒 → allowed 次之拒 → 通过

Stage 参数：

| Stage | 用途 | 退出码 |
|-------|------|--------|
| `inspect` | 手动自检，看当前有没有越界 | 0=OK / 1=violation |
| `agent-hook` | 被工具 hook 调用 | 0=OK / 2=block（让工具阻断后续操作） |
| `pre-commit` | Git hook 调用，只看 staged files | 0=OK / 1=reject commit |

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
| `.\h <role>` | 认领角色；若与当前角色相同则复用，不重复领取；仅角色变化时写身份并跑 inspect |
| `.\h install-hooks` | 安装 Git pre-commit hook |
| `.\h doctor` | 自检 role/roles.json/guard/hook 是否就绪 |
| `.\h` | 显示用法和当前 role |

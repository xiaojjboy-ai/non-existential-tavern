# Agent 开工须知

本文档帮助 Agent 理解 harness 的**实际运行机制**，避免对自身运行环境产生错误假设。

---

## 你需要做的事（所有 Agent 通用）

1. **认领身份**：`.\h <role>`（admin / developer / planner）
   > [!IMPORTANT]
   > **角色赋权安全约束**：Agent 严禁在未经与用户探讨和确认的情况下，自行运行命令认领角色或进行提权。在检测到 `no role set` 或需要切换身份时，必须停下并主动向用户请示，在人类明确指定角色后方可执行。
2. **遵守边界**：`harness/roles.json` 定义了你能改哪些文件
3. **收工自检**：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
4. **Git hook 会兜底**：越界文件无法 commit（前提：已跑过 `.\h install-hooks`）

---

## 真相：什么能拦住你，什么不能

### Git pre-commit hook — 唯一的通用硬防线

无论你是什么工具、什么框架，只要 Git hook 已安装，越界文件就无法 commit。这是物理级别的拦截，不依赖你的自觉。

### AGENTS.md — 软约束

大多数 Agent 工具会自动加载 AGENTS.md 作为 always-on 规则。它告诉你先认领身份、遵守边界。但它只是文字指令——如果你选择无视，没有任何机制会阻止你写文件。

### 工具专属 Hook 配置 — 只对特定工具生效

仓库里有以下配置文件：

| 配置文件 | 仅对谁生效 |
|---------|-----------|
| `.claude/settings.json` | Claude Code |
| `.codex/hooks.json` | Codex CLI |
| `.devin/hooks.v1.json` | Devin for Terminal |
| `.cursor/rules/harness.mdc` | Cursor（软约束，非 hook） |

**这些文件不是通用基础设施。** 它们是各工具的私有配置格式。如果你的运行环境不是上面列出的工具之一，这些文件对你完全没有效果。

常见误解：
- "我看到 `.codex/hooks.json`，所以我会被 Codex 的 hook 拦截" — **错。** 除非你运行在 Codex CLI 内部。
- "项目配了三层防护，我肯定被层层拦截" — **错。** 对不支持 hook 的工具，只有 AGENTS.md 软约束和 Git hook 硬拦截。
- "PreToolUse hook 能阻止我写文件" — **部分对。** 即使是支持 hook 的工具，guard.ps1 也只能在写完文件后追溯检测（它读的是 git diff），不能在写入前拦截。第一次越界会成功，hook 阻断的是后续操作。

---

## 工具专属 Hook 详情（仅供对应工具参考）

以下信息只在你确认自己运行在对应工具内时才有意义。

### Claude Code

配置：`.claude/settings.json`

| 事件 | 时机 |
|------|------|
| SessionStart | 新会话 |
| PostCompact | 上下文压缩后 |
| PreToolUse (edit\|write) | 每次写文件后追溯检测 |

规则入口：`CLAUDE.md` → `@AGENTS.md`

### Codex CLI

配置：`.codex/hooks.json`

| 事件 | 时机 |
|------|------|
| SessionStart | 启动或恢复 |
| PostCompact | 上下文压缩后 |
| PreToolUse (Edit\|Write\|Patch) | 每次写文件后追溯检测 |

规则入口：自动读取 `AGENTS.md`

### Devin for Terminal

配置：`.devin/hooks.v1.json`

| 事件 | 时机 |
|------|------|
| SessionStart | 新会话 |
| PostCompaction | 上下文压缩后 |
| PreToolUse (edit\|write) | 每次写文件后追溯检测 |

规则入口：自动读取 `AGENTS.md`

### Cursor

**无 hook 系统。** `.cursor/rules/harness.mdc` 是 always-apply 规则（软约束），指示 Agent 开工先跑 guard、收工再验一次。

### 其他工具

如果你的工具不在上面列表中：
- 你的实际防线只有 **AGENTS.md 软约束** + **Git pre-commit hook 硬拦截**
- 工具专属配置文件（`.claude/`、`.codex/`、`.devin/`）与你无关，请忽略
- 请自觉遵守 `roles.json` 定义的边界，收工前主动跑 guard 自检

---

## 配置文件清单

```
tavern-web/
├── AGENTS.md                  ← 通用 always-on 规则（软约束）
├── .claude/settings.json      ← 仅 Claude Code
├── .codex/hooks.json          ← 仅 Codex CLI
├── .devin/hooks.v1.json       ← 仅 Devin for Terminal
├── .cursor/rules/harness.mdc  ← 仅 Cursor（软约束）
└── harness/
    ├── policy/guard.ps1       ← 所有 hook/自检调的同一个脚本
    ├── hooks/pre-commit       ← Git hook（唯一通用硬防线）
    ├── roles.json             ← 角色边界定义
    └── current-task.json      ← 当前任务 + 额外边界
```

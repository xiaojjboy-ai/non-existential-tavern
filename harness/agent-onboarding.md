# Agent 开工配置

本文档说明各 Agent 工具如何接入 harness 的角色边界守卫。

---

## 目标

不管用哪个 Agent 工具，都要做到：

1. **Session 启动时** — 跑 guard，确认角色身份和文件边界
2. **上下文压缩后** — 跑 guard，防失忆越界
3. **写文件前** — 跑 guard，检测已有越界并阻断后续操作
4. **Git 提交前** — pre-commit hook 兜底

## 调用的脚本

所有 hook 都调同一个脚本：

```powershell
powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook
```

它只做一件事：读角色 → 读边界 → 扫改动 → 越界就报错退出。

---

## 各工具配置

### 1. Claude Code

**配置文件**：`.claude/settings.json`（已创建，提交入 git）

**触发点**：

| 事件 | 触发时机 | 说明 |
|------|---------|------|
| `PostCompact` | 上下文压缩完成后 | 防失忆 |
| `SessionStart` | 新会话或恢复 | 开工验证 |
| `PreToolUse` (edit/write) | 每次写文件前 | 实时拦截 |

**规则文件**：Claude Code 自动读取项目根目录的 `CLAUDE.md`（always-on），其内容 `@AGENTS.md` 引用了 AGENTS.md 作为常驻规则。

**验证命令**：在 Claude Code 中输入 `/hooks` 查看已加载的 hook。

---

### 2. Codex CLI (OpenAI)

**配置文件**：`.codex/hooks.json`（已创建，提交入 git）

**触发点**：

| 事件 | 触发时机 | 说明 |
|------|---------|------|
| `PostCompact` | 上下文压缩完成后 | 防失忆 |
| `SessionStart` (startup/resume) | 启动或恢复 | 开工验证 |
| `PreToolUse` (Bash/Write/Edit/Patch) | 写操作前 | 实时拦截 |

**规则文件**：Codex 自动读取 `AGENTS.md`（每个目录级联，子目录优先）。

**Windows 支持**：配置中的 `commandWindows` 字段确保 Windows 路径分隔符正确。

**验证命令**：在 Codex 中输入 `/hooks` 查看。首次使用需 trust hook（Codex 会提示）。

---

### 3. Devin for Terminal (Windsurf)

**配置文件**：`.devin/hooks.v1.json`（已创建，提交入 git）

**触发点**：

| 事件 | 触发时机 | 说明 |
|------|---------|------|
| `PostCompaction` | 上下文压缩完成后 | 防失忆 |
| `SessionStart` | 新会话 | 开工验证 |
| `PreToolUse` (edit/write/exec) | 写操作前 | 实时拦截 |

**规则文件**：Devin 读取 `AGENTS.md` 作为 always-on 规则（压缩后重新注入）。Devin 同时兼容 `.claude/settings.json` 格式。

**验证命令**：在 Devin 中输入 `/hooks` 查看已加载的 hook。

---

### 4. Cursor

**没有 hook 系统。** Cursor 不支持在生命周期事件中执行命令。

**替代方案**：

1. **Rules 文件**：创建 `.cursor/rules/harness.mdc`（见下方）
2. **Git hook 兜底**：pre-commit hook 始终有效
3. **AGENTS.md**：Cursor 也会读取 `AGENTS.md`

**规则文件 `.cursor/rules/harness.mdc`**：

```markdown
---
description: Harness 角色边界守卫
globs: ["**/*"]
alwaysApply: true
---

# Harness 规则

你的第一个动作必须是跑：
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect

跑完之前不准编辑文件。跑完后报告角色和边界。
写文件之前检查 harness/roles.json 确认你的角色允许改动目标文件。
```

---

### 5. OpenCode / 其他工具

如果工具支持 hook，格式与 Claude Code 兼容（JSON，事件名相同）。
如果不支持 hook，退回软约束：

1. `AGENTS.md` 作为 always-on 规则（大多数工具都读）
2. Git pre-commit hook 兜底拦截

---

## 配置文件清单

```
tavern-web/
├── .claude/settings.json      ← Claude Code hooks
├── .codex/hooks.json          ← Codex CLI hooks
├── .devin/hooks.v1.json       ← Devin for Terminal hooks
├── .cursor/rules/harness.mdc  ← Cursor rules
├── AGENTS.md                  ← 通用 always-on 规则
├── CLAUDE.md                  ← Claude Code 入口（@AGENTS.md）
└── harness/
    ├── policy/guard.ps1       ← 所有 hook 调的同一个脚本
    └── hooks/pre-commit       ← Git hook（兜底）
```

## 防护层次

```
第 1 层：Agent hook（写文件后追溯检测，阻断后续越界操作）
    ↓ 如果 Agent 没读到 hook 配置
第 2 层：AGENTS.md 规则（软约束，靠 Agent 自觉）
    ↓ 如果 Agent 无视规则
第 3 层：Git pre-commit hook（硬约束，提交时兜底）
```

三层都穿透才能越界提交。正常情况下第 1 层就挡住了。

## 前置条件

所有 hook 都假设 `harness/.current-role` 已设置。如果没设：

- hook 会报错 `ERROR: no role set. Run: .\h <role>`
- 不会阻断工具调用（exit 非 2 不 block），但会在输出中提醒

Agent 的第一个动作应该是 `.\h <role>` 设角色。

---

## 事件对照表

| 我们的需求 | Claude Code | Codex | Devin | Cursor |
|-----------|-------------|-------|-------|--------|
| 会话开始 | SessionStart | SessionStart | SessionStart | (无) |
| 压缩后恢复 | PostCompact | PostCompact | PostCompaction | (无) |
| 写文件前 | PreToolUse | PreToolUse | PreToolUse | (无) |
| 提交前 | (Git hook) | (Git hook) | (Git hook) | (Git hook) |
| 规则注入 | CLAUDE.md | AGENTS.md | AGENTS.md | .cursor/rules/ |

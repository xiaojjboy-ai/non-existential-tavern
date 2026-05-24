# Hook 配置指南

给人类看的。目的：说清楚这套 hook 到底干了什么、怎么接、为什么这么接。

---

## 核心只有一个脚本

所有 hook 最终都调同一个东西：

```
harness/policy/guard.ps1
```

它做的事极其简单：

1. 读 `harness/.current-role`（你是谁）
2. 读 `harness/roles.json`（谁能改什么）
3. 读 `harness/current-task.json`（当前任务有没有额外收紧/放宽）
4. 跑 `git diff`（现在改了哪些文件）
5. 逐文件比对：forbidden 命中 → 拒；不在 allowed 里 → 拒；都没问题 → 过

就这样。没有网络请求，没有数据库，没有外部依赖。纯本地、纯文件系统。

---

## 三种调用场景

guard.ps1 通过 `-Stage` 参数区分被谁调用，行为几乎一样，只有两点不同：**扫描范围**和**退出码**。

### 场景 1：手动自检（inspect）

```powershell
powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage inspect
```

- **谁调**：人类或 Agent 主动跑
- **扫什么**：staged + unstaged + untracked，全部改动
- **退出码**：0 = 没越界，1 = 有越界
- **用途**：开工前确认身份和边界、收工前自检

### 场景 2：Agent 工具 Hook（agent-hook）

```powershell
powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook
```

- **谁调**：Agent 工具的 hook 系统自动调（如果工具支持的话）
- **扫什么**：staged + unstaged + untracked，全部改动
- **退出码**：0 = 没越界，**2 = 有越界**
- **为什么退出码是 2 不是 1**：Claude Code / Codex / Devin 的 hook 协议规定 exit 2 = 阻断后续工具调用。exit 1 只是"出错了"，不会阻断。

### 场景 3：Git pre-commit hook（pre-commit）

```powershell
powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage pre-commit
```

- **谁调**：Git，在 `git commit` 时自动调
- **扫什么**：**只看 staged files**（`git diff --cached`）
- **退出码**：0 = 放行提交，1 = 拒绝提交
- **用途**：最后一道硬防线，越界文件无法提交

---

## 两层防线的真相

```
写文件时 ─── Agent Hook 追溯检测（仅特定工具，且有延迟）
                │
                │  hook 没拦住 / 工具不支持 hook
                ▼
git commit ─── Git pre-commit hook 硬拦截（所有工具通用）
```

**Git hook 是唯一的物理硬防线。** Agent hook 只是提前发现问题的辅助手段。

### Agent Hook 的局限性

Agent hook 挂在 `PreToolUse` 事件上（写文件前触发），但 guard.ps1 检测的是 `git diff`（已经写到磁盘的文件）。这意味着：

1. Agent 第一次越界写文件 → guard 还没看到这次改动 → **放行**
2. Agent 第二次准备写文件 → hook 触发 → guard 扫到第一次的越界 → **exit 2 阻断**

所以 hook 不能阻止第一次越界，只能在第二次操作时发现并阻断。第一次越界的文件仍然会写到磁盘上，但无法通过 Git commit。

如果想做到真正的写前拦截，需要 guard.ps1 解析 hook 传入的 stdin（工具准备写的文件路径），而不是读 git diff。这是个 TODO，目前没做。

---

## 怎么给一个新工具接 Hook

### 前置条件

你的工具需要支持以下能力：

1. **生命周期事件系统**：能在特定事件（会话开始、上下文压缩、工具调用前）触发外部命令
2. **执行本地 shell 命令**：能跑 `powershell -ExecutionPolicy Bypass -File ...`
3. **根据退出码决定行为**：exit 0 放行，exit 2 阻断

如果你的工具不支持以上任何一项，就不能接 hook。退回软约束（AGENTS.md）+ Git hook 兜底。

### 需要挂的三个事件

| 事件 | 为什么要挂 | matcher 建议 |
|------|-----------|-------------|
| SessionStart | Agent 启动时确认角色和边界。防止 Agent 在没认领身份的情况下开始工作 | 空（所有 session 都触发）|
| PostCompact / PostCompaction | 上下文压缩后 Agent 会丢失之前的记忆。重新跑 guard 让输出提醒 Agent 当前角色和边界 | 空 |
| PreToolUse | Agent 每次调用写文件工具前检测已有越界。如果有越界，exit 2 阻断后续写入 | 只匹配写操作（edit、write、patch 等）|

三个事件调的都是同一条命令，同一个 stage：

```
powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook
```

### 配置模板

最小可用的 hook 配置长这样（JSON 伪代码，具体格式看你的工具文档）：

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook",
        "timeout": 10
      }]
    }],
    "PostCompact": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook",
        "timeout": 10
      }]
    }],
    "PreToolUse": [{
      "matcher": "edit|write",
      "hooks": [{
        "type": "command",
        "command": "powershell -ExecutionPolicy Bypass -File ./harness/policy/guard.ps1 -Stage agent-hook",
        "timeout": 10
      }]
    }]
  }
}
```

### 各工具的差异点

| 差异 | Claude Code | Codex CLI | Devin |
|------|------------|-----------|-------|
| 配置文件位置 | `.claude/settings.json` | `.codex/hooks.json` | `.devin/hooks.v1.json` |
| JSON 根键 | `"hooks": { ... }` | `"hooks": { ... }` | 直接是事件名（无 hooks 包裹） |
| 压缩后事件名 | `PostCompact` | `PostCompact` | `PostCompaction`（多个 ion） |
| PreToolUse matcher | `(?i)edit\|write` | `^(Bash\|Write\|Edit\|Patch)$` | `edit\|write` |
| Windows 路径 | 不需要额外处理 | `commandWindows` 字段用 `\\` | 不需要额外处理 |
| 额外字段 | 无 | `statusMessage`（显示在 UI） | 无 |
| 首次使用 | 自动加载 | 需要 trust hook（工具会提示） | 自动加载 |

### PreToolUse matcher 怎么写

matcher 是正则表达式，匹配的是工具名称（不是文件路径）。不同工具对"写文件"的工具名叫法不同：

- Claude Code：`edit`、`write`（小写）
- Codex CLI：`Bash`、`Write`、`Edit`、`Patch`（首字母大写）
- Devin：`edit`、`write`（小写）

所以 matcher 要根据目标工具的工具名来写。写宽一点用 `(?i)edit|write` 做 case-insensitive 匹配。

**不要匹配 `exec`/`bash`/`command` 等通用执行命令**——guard.ps1 本身就是通过 shell 执行的，匹配执行命令会导致 guard 触发自己，无限递归或严重影响性能。Codex 的 `Bash` 是个例外，因为 Codex 的 matcher 在 hook 命令自身执行时不会递归触发。

---

## Git Hook 安装

Git hook 不需要工具支持，装一次对所有工具生效：

```powershell
.\h install-hooks
```

它做的事：把 `harness/hooks/pre-commit` 拷到 `.git/hooks/pre-commit`。

这个 shell 脚本会调 `harness/hooks/pre-commit.ps1`，后者调 `guard.ps1 -Stage pre-commit`。

两层套娃的原因：`.git/hooks/pre-commit` 必须是 shell 脚本（Git 规定），但实际逻辑写在 PowerShell 里（和 guard.ps1 一致）。

---

## 验证 Hook 是否生效

### 验证 Git hook

```powershell
# 故意制造一个越界文件
.\h developer
echo test > harness/policy/test.txt
git add harness/policy/test.txt
git commit -m "test"
# 应该被拒绝：FORBIDDEN: developer cannot modify harness/policy/test.txt
git reset HEAD harness/policy/test.txt
rm harness/policy/test.txt
```

### 验证 Agent hook

在对应工具中输入 `/hooks` 查看已加载的 hook 列表（Claude Code、Codex、Devin 都支持这个命令）。

然后以 developer 角色开始工作，尝试修改 `harness/policy/` 下的文件，观察 hook 输出。

---

## 文件清单

```
harness/
├── policy/guard.ps1         ← 核心脚本，所有 hook 都调它
├── hooks/
│   ├── pre-commit           ← Git hook 入口（shell 脚本）
│   └── pre-commit.ps1       ← Git hook 实际逻辑
├── roles.json               ← 角色边界定义
├── current-task.json        ← 当前任务 + 额外约束
└── .current-role            ← 当前角色（gitignore，不提交）

.claude/settings.json        ← Claude Code hook 配置
.codex/hooks.json            ← Codex CLI hook 配置
.devin/hooks.v1.json         ← Devin hook 配置
.cursor/rules/harness.mdc   ← Cursor 软约束（无 hook）
```

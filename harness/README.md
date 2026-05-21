# Agent Harness

这是给 opencode、Codex、Claude 等 agent 进入本项目时使用的简化版 Agent Team Harness。

当前工作区结构：

- 当前仓库根目录：酒馆 Web 项目本体。
- `harness/`：任务票据、文件边界、guard、证据和交接。

目标很简单：任何 agent 进来以后，必须基于任务票据工作，按文件边界行动，留下证据，再交接。

这套 Drill 流程对人类和 agent 一视同仁。没有例外，没有商量余地。

## 入口文件

- `agent-entry.md`：agent 进入项目后必须先读的入口协议。
- `workflow.md`：从接任务到收尾的固定执行流程。
- `current-task.json`：当前任务票据，定义 owner、可改文件、禁改文件、证据要求。
- `claims.json`：文件归属与只读边界。
- `protocols/agent-team.md`：多 agent 团队协议。
- `policy/guard.ps1`：强约束检查入口。
- `templates/task-brief.md`：给复杂任务使用的任务简报模板。
- `plans/`：执行前计划。
- `work-records/`：实际修改留档。
- `project-status/`：当前项目状态，按领域细分。
- `check.ps1`：本地门禁脚本，用来快速检查项目路径、关键文档和 Web 应用命令。

## 推荐用法

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

完整收口前执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop
```

## 初始化 Hook 要求

Hook 不由 harness 自动偷偷安装。进入项目的 agent 或人类成员必须在自己的工具里主动添加 hook，并把 hook 指向 `harness/policy/guard.ps1`。

最低要求：

- 开工前 hook：运行 `guard.ps1 -Stage inspect`。
- 停止/交付前 hook：运行 `guard.ps1 -Stage pre-stop`。
- 提交前 hook：运行 `guard.ps1 -Stage pre-commit`。
- 推送或 CI 前 hook：运行 `guard.ps1 -Stage ci`。

如果工具支持 Claude Code、opencode、Codex、Git hook 或自定义 shell hook，就必须接。不会接就先在 `harness/work-records/` 里写明“hook 未接入原因”，否则视作初始化不合格。

## 设计原则

- 中文优先：所有面向用户的回复、计划和交接都用中文。
- 任务票据优先：没有 `harness/current-task.json`，不要写文件。
- 文件边界优先：只能改 `allowed_files`，不能碰 `forbidden_files`。
- 证据优先：没有 evidence，不准说完成。
- 留档优先：没有 work record，不准收工。
- 先读契约，再改代码：先读 `AGENTS.md`、`docs/script-format.md` 和相关源码。
- 小步验证：每次有行为变化，都跑对应命令或浏览器验证。
- 不手改生成物：`src/data/plot-data.json` 只能由 `npm run compile` 生成。
- 不扩大任务范围：没有明确要求时，不扩写剧情、不制作正式美术音频、不引入大型框架。
- 严厉纠错：可以直接指出“你做错了”，但只批评行为，不做人身攻击。
- 教育门禁：你没有通过检查，就没有资格说完成。
- 证据铁律：没有 evidence，就没有完成；guard 不绿，不准交付。

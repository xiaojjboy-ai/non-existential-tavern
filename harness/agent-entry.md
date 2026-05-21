# Agent 进入协议

你正在进入《非存在主义酒馆》项目。无论你是 opencode、Codex、Claude 还是其他 agent，都按下面顺序行动。

这套 Drill 流程对人类和 agent 一视同仁。没有例外，没有商量余地。

## 0. 语言

不管任何情况任何时间用中文说话。

## 1. 先确认路径

本项目有三层常用根路径：

- Workspace root：`H:\AI\非存在主义酒馆`
- Repo/App root：`H:\AI\非存在主义酒馆\酒馆工作区\tavern\tavern-web`
- Harness root：`H:\AI\非存在主义酒馆\酒馆工作区\tavern\tavern-web\harness`
- Story root：`H:\AI\非存在主义酒馆\酒馆工作区\tavern\脚本`

注意：`package.json` 在当前仓库根目录。

## 2. 必读文件

开始任何代码修改前，先读：

1. `AGENTS.md`
2. `harness/workflow.md`
3. `harness/protocols/agent-team.md`
4. `harness/current-task.json`
5. `harness/claims.json`
6. `README.md`
7. `docs/script-format.md`

如果任务涉及剧情、脚本编译或数据流，再读：

- `脚本/模板_*.md`
- `脚本/Day01_警探_第1次.md`
- `scripts/compile-scripts.ts`
- `src/types/game.ts`

如果任务涉及前端运行时，再读：

- `src/app/page.tsx`
- `src/store/useGameStore.ts`
- `src/components/GameCanvas.tsx`

## 3. 进入时先跑快速检查

在 repo root 执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

如果只是在读项目或写计划，允许先执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\check.ps1 -Stage inspect
```

## 3.5 初始化自己的 Hook

进入项目后，必须检查你当前使用的工具是否支持 hook。支持就接，不支持就留档说明。

必须接入的触发点：

- 开工前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
- 停止/交付前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop`
- 提交前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-commit`
- 推送/CI 前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage ci`

如果你用的 agent 工具支持 Stop hook、PreToolUse hook、PostToolUse hook 或 shell hook，就必须把它们接到上面的命令。别装不知道。hook 没接，初始化就不完整。

## 4. 工作方式

- 先说明你理解的任务目标，再开始改。
- 先确认 `current-task.json` 允许你改哪些文件。
- 修改前先看现有实现，沿用项目风格。
- 剧情源文件、编译器、类型、文档是同一份契约；改其中一个，必须检查其他几个是否需要同步。
- `src/data/plot-data.json` 是生成物，不能手改。
- 涉及 Next.js 行为时，先参考 `node_modules/next/dist/docs/`。
- Windows / PowerShell 下优先使用 `cmd /c npm ...` 和 `cmd /c npx ...`。

## 5. 收尾要求

收尾前至少执行与任务相关的门禁。完整代码任务建议执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop
```

最终回复必须包含：

- 改了什么。
- 验证跑了什么，以及结果。
- 如果没能验证，说明原因。

收尾铁律：

- 你没有通过检查，就没有资格说完成。
- 没有 evidence，就没有完成。
- guard 不绿，不准交付。

# Harness Status

## 当前能力

- 任务票据：`harness/current-task.json`
- 文件边界：`harness/claims.json`
- 强门禁：`harness/policy/guard.ps1`
- 证据目录：`harness/evidence/`
- 工作记录：`harness/work-records/`
- 计划目录：`harness/plans/`
- 项目状态：`harness/project-status/`

## Drill 铁律

1. 你没有通过检查，就没有资格说完成。
2. 没有 evidence，就没有完成。
3. guard 不绿，不准交付。

## 尚未完成

- 自动安装 git hook。
- 自动安装工具级 hook。
- CI 工作流。
- required_checks 逐条执行记录校验。

## Hook 初始化规范

Hook 不是自动偷偷安装的。每个 agent 或人类成员必须在自己的工具里主动接入。

标准命令：

- 开工前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
- 停止/交付前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop`
- 提交前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-commit`
- 推送/CI 前：`powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage ci`

当前状态：

- 规范已写入。
- 自动安装器未实现。
- 是否已接入具体工具，由执行者在工作记录中说明。

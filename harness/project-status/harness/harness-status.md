# Harness Status

## 当前能力

- 角色认领：`.\h <role>`，角色为 `admin` / `developer` / `planner`。
- 角色边界：`harness/roles.json`。
- 当前任务：`harness/current-task.json`。
- 自检门禁：`harness/policy/guard.ps1`。
- Git hook 模板：`harness/hooks/pre-commit`、`harness/hooks/pre-commit.ps1`。
- Hook 文档：`harness/hook-guide.md`。
- 工作留档：`harness/records/<role>/<task-id>.md`。
- 留档模板：`harness/records/_template.md`。
- 项目状态：`harness/project-status/`。

## 当前流程

- 开工前按用户指定身份执行 `.\h <role>`。
- 首次克隆或 hook 丢失时执行 `.\h install-hooks`。
- 交付前运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

- 任务结束前必须写入 `harness/records/<role>/` 留档。

## 当前状态

- Harness 已从旧的 claims/evidence/work-records 结构精简为角色边界 + Git hook + records 留档。
- 旧文档中提到的 `harness/claims.json`、`harness/evidence/`、`harness/work-records/` 已过时。
- 是否接入具体工具级 hook，由执行者在工作记录中说明。

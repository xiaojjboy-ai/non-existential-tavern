# Work Record: harness-setup

## 执行者

Codex

## 任务

搭建并整理简化版 Agent Team Harness。

## 修改范围

- `harness/`
- `AGENTS.md`

## 已完成

- 建立任务票据、文件边界、证据、交接和 Drill 门禁。
- 将 harness 纳入当前项目仓库。
- 同步当前仓库根目录下的 guard 路径。
- 补充教育型 Drill 话术。
- 新增计划、工作记录、项目状态留档目录。
- 纠正为单一项目仓库提交，不再把 harness 当成独立 meta 仓库。

## 验证

- `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
- `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop`
- `powershell -ExecutionPolicy Bypass -File .\harness\check.ps1 -Stage inspect`

## Hook 初始化

- 当前规范已要求每个 agent 或人类成员进入项目后自行接入工具 hook。
- 本轮未自动安装 git hook 或工具级 hook。
- 自动安装器尚未实现。

## 证据

- `harness/evidence/harness-setup-inspect.txt`

## 风险

- 尚未接 git hook、CI、Claude/opencode/Codex 工具级 hook。
- `required_checks` 目前仍通过 evidence 间接约束，尚未逐条校验执行记录。
- 旧目录 `H:\AI\非存在主义酒馆\非存在主义酒馆` 暂未删除。
- 当前提交只应包含 `harness/` 和 `AGENTS.md`；其他 agent 的业务改动不混入本次提交。

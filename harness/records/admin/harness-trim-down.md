# harness-trim-down

**人类负责人**：奥利维拉 (xiaojjboy@gmail.com)
**角色**：admin
**Agent 工具**：Devin (Claude Opus)
**接任务**：2026-05-24 — 把 harness 从企业化全家桶砍成角色+边界+简单留档
**完成**：2026-05-24 — 重写 guard.ps1、h.bat、roles.json、README，删除 sessions/evidence/protocols/claims 等冗余

## 改了什么

- 新增 `harness/roles.json`（角色边界唯一真相源）
- 重写 `harness/policy/guard.ps1`（极简：读角色→读边界→扫 git diff→拒/通过）
- 重写 `h.bat`（支持 role / install-hooks / doctor）
- 新增 `harness/hooks/pre-commit` + `pre-commit.ps1`（Git hook 模板）
- 新增 `harness/records/` 按角色分目录留档
- 重写 `harness/README.md` 为唯一入口文档
- 精简 `AGENTS.md`（砍掉重复规则，保留项目背景索引）
- 更新 `.gitignore` 和 `harness/.gitignore`
- 迁移旧 work-records 到 `records/admin/`
- 删除：sessions/ evidence/ work-records/ protocols/ templates/ claims.json check.ps1 handoff.md agent-entry.md workflow.md harness-runs/

## 怎么验证

- `.\h admin` 认领身份 + guard inspect 通过
- planner 改 src/ → guard 拒绝
- developer 改 脚本/ → guard 拒绝
- `.\h install-hooks` + Git hook 端到端测试
- `cmd /c npx tsc --noEmit` / `cmd /c npm run lint` / `cmd /c npm run build` 项目代码不动应通过

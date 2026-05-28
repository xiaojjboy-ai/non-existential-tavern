# 角色领取幂等修复

**人类负责人**：henan
**角色**：admin
**Agent 工具**：GitHub Copilot (GPT-5.3-Codex)
**接任务**：2026-05-28 — 修复已有本地角色时重复领取的问题
**完成**：2026-05-28 — 同角色重复执行 `./h <role>` 将直接复用

## 改了什么

- 修改 `h.bat` 的 `:setrole` 逻辑。
- 当 `harness/.current-role` 中角色与目标角色一致时，输出 `role unchanged: <role>` 并直接退出。
- 仅在角色实际变化时才写入 `harness/.current-role` 并触发 inspect。
- 同步更新 `harness/README.md` 的 `./h <role>` 说明，明确同角色复用行为。

## 怎么验证

- 连续执行两次 `cmd /c .\h admin`，输出均为 `role unchanged: admin`。
- 执行 `chcp.com 65001 > $null; powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`，返回 `OK role=admin`。

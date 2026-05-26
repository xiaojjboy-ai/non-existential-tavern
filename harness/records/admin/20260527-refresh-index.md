# 任务记录：刷新项目全索引

## 角色

admin

## 修改意图

合并远程与本地提交后，项目入口索引、状态索引和 Day01 QA 路径存在过期内容，需要同步为当前仓库事实。

## 完成内容

- 刷新 `README.md`，更新目录关系、剧情索引、角色索引、系统状态和 GitHub CLI 状态。
- 刷新 `harness/project-status/` 下 overview、runtime、content、harness、risks 状态页。
- 修正 `AGENTS.md` 中过时的 Day01 QA 路径，移除已不存在的 `ch_01_05` / `ch_01_06`。
- 将 `AGENTS.md` 从长篇规范重构为索引单与规则清单，细节改由 `README.md`、`harness/README.md`、`harness/project-status/` 等文件承载。
- 更新 `harness/current-task.json`，将当前任务从旧的 `harness-trim-down` 改为 `refresh-index`。
- 更新 GitHub CLI 状态：`gh` 已安装，版本 `2.92.0`，但尚未登录。

## 验证方式

- 使用 `rg` 检查过时关键词和索引项。
- 对照 `脚本/Day01_警探_第1次.md` 中实际 `[CHOICE ch_01_*]` 清单确认 QA 路径。
- 使用 `gh --version` 与 `gh auth status` 确认 GitHub CLI 安装与登录状态。

## 备注

本次只更新文档索引和留档，不改运行时代码。

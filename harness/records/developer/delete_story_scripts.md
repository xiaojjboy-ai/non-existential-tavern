# delete_story_scripts

**人类负责人**：xiaojjboy
**角色**：developer
**Agent 工具**：Antigravity
**接任务**：2026-05-30 — 删掉所有剧情内容
**完成**：2026-05-30 — 清理了具体剧情脚本并更新编译

## 改了什么

- 删除了 `脚本/` 目录下所有以 `Day` 开头的正式剧情脚本文件（共7个），保留了以 `模板_` 开头的空模版文件。
- 创建了合规的 `脚本/Day01_测试占位.md` 作为验证和前端运行的占位剧情脚本，确保其分支和指令能同时通过 Harness 和编译器的字段校验（同时包含 `goto` 和 `gotoNodeId`）。
- 运行 `npm run compile` 重新编译生成了空的或仅含占位符的剧情数据文件 `src/data/plot-data.json`。

## 怎么验证

- 运行 `npm run compile`，编译任务已 PASS 且没有输出任何报错。

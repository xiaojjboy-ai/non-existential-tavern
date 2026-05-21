# Known Risks

## R1: 旧目录仍保留

旧目录 `H:\AI\非存在主义酒馆\非存在主义酒馆` 暂未删除。后续清理前必须确认新工作区完整可用。

## R2: Web 仓库有外部改动

当前仓库中存在其他 agent 产生的未提交改动。不要混入 harness 提交。

## R3: Harness 尚未接自动触发

当前 guard 需要手动运行。尚未接 git hook、CI、Claude/opencode/Codex 工具级 hook。

# Known Risks

## R1: 旧目录仍保留

旧目录 `H:\AI\非存在主义酒馆\非存在主义酒馆` 仍保留。后续清理前必须确认当前工作区完整可用。

## R2: 生成物不要手改

`src/data/plot-data.json` 是 `cmd /c npm run compile` 的输出。修改剧情时应改 `脚本/*.md`，再重新编译。

## R3: 文档索引容易过期

剧情路径、角色清单和 harness 结构变化后，必须同步更新：

- `README.md`
- `AGENTS.md`
- `harness/project-status/`

## R4: GitHub CLI 未登录

当前环境已安装 GitHub CLI `2.92.0`，但尚未登录。需要 GitHub 操作时先执行 `gh auth login`。

## R5: 分支确认事故

曾发生本地 `master` 推送到远端 `main` 的流程事故。新的铁律：

- 上传前确认当前分支、上游分支、远端默认分支和准备推送目标。
- 本地分支、上游分支、目标远端没对齐，不准 push。
- 推送前优先看 `git status --short --branch`。

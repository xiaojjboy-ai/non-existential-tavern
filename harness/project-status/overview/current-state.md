# Current Project State

## 当前结构

- 当前仓库根目录：酒馆 Web 项目本体。
- `脚本/`：正式剧情 Markdown 源文件。
- `docs/characters/`：角色设定资料和角色专属 Agent 运行规则。
- `src/`：Next.js 前端、剧情运行时、Pixi 画面和调酒 UI。
- `scripts/compile-scripts.ts`：剧情编译器。
- `harness/`：角色边界、Git hook、自检门禁、计划和留档。

## 当前内容

- 已有正式剧情：`Day01_警探_第1次.md`、`Day02_维修师_第1次.md`。
- 已有角色资料：Lendro、Old Mike、En Neer、Sylvena。
- 已有 V2 调酒评价：`src/engine/DrinkEvaluator.ts`。
- 已有 CRT Mixing Station UI：`src/components/MixingStation.tsx`。

## 当前 Git 状态

- 当前分支：`main`。
- 上游分支：`origin/main`。
- 当前 HEAD 与 `origin/main` 指向同一提交：`e4447fd`。
- 本轮索引刷新产生了未提交文档改动；提交前先确认这些改动都属于索引刷新任务。

## 当前注意事项

- `src/data/plot-data.json` 是生成物，不要手改。
- Day01 当前 QA 路径只到 `ch_01_04`，旧索引里的 `ch_01_05` / `ch_01_06` 已过时。
- GitHub CLI 已安装但未登录，使用前运行 `gh auth login`。
- 旧目录 `H:\AI\非存在主义酒馆\非存在主义酒馆` 仍保留，清理前必须确认当前工作区完整可用。

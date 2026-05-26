# 非存在主义酒馆 Web 原型

`tavern-web/` 是项目当前的前端应用和剧情运行原型。

- Next.js 16 + React 19 + TypeScript。
- Zustand 管理剧情推进、选择、调酒和运行时状态。
- `@pixi/react` + PixiJS 渲染全屏酒馆画面。
- `脚本/*.md` 是剧情源文件，`npm run compile` 生成 `src/data/plot-data.json`。

## 目录关系

- `脚本/`：正式剧情 Markdown + YAML 源文件，模板文件以 `模板_` 开头。
- `docs/characters/`：角色设定和角色专属 Agent 运行规则。
- `docs/script-format.md`：剧情格式契约。
- `docs/data-contract-v2.md`：运行时数据契约参考。
- `scripts/compile-scripts.ts`：剧情编译器。
- `src/app/page.tsx`：页面入口。
- `src/store/useGameStore.ts`：剧情推进、choice、drink、runtime 状态。
- `src/components/GameCanvas.tsx`：Pixi 全屏画面。
- `src/components/MixingStation.tsx`：V2 调酒交互 UI。
- `src/engine/DrinkEvaluator.ts`：调酒结果评价。
- `harness/`：角色边界、门禁、hook、留档和项目状态索引。

## 启动与验证

在 `tavern-web/` 目录执行：

```powershell
cmd /c npm run dev -- --hostname 127.0.0.1 --port 3000
```

浏览器打开：

- `http://127.0.0.1:3000`

本地命令门禁：

```powershell
cmd /c npm run compile
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run lint
cmd /c npm run build
```

## 当前剧情索引

- `脚本/Day01_警探_第1次.md`：Lendro 第一次来访，当前 QA 主路径为 `ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A`。
- `脚本/Day02_维修师_第1次.md`：维修师第一次来访。
- `src/data/plot-data.json` 是编译生成物，不要手改。

## 当前角色索引

- `docs/characters/lendro/`：警探 Lendro。
- `docs/characters/old_mike/`：酒保 Old Mike。
- `docs/characters/en_neer/`：安尼尔。
- `docs/characters/sylvena/`：猫女 Sylvena。
- `docs/characters/00_角色设定模板.md`：角色设定模板。

## 当前系统状态

- 已合并远程剧情、角色文档、图片工具、猫咪素材和本地 V2 调酒系统。
- Harness 已精简为角色边界、Git hook、自检门禁和 `harness/records/` 留档。
- `main` 当前 HEAD 与 `origin/main` 指向同一提交；本轮索引刷新产生了未提交文档改动。
- GitHub CLI 已安装，版本为 `2.92.0`；当前尚未登录，使用前运行 `gh auth login`。

更细的接管索引见 `harness/project-status/`。

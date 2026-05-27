# Web Runtime Status

## 当前事实

- 应用位于当前仓库根目录。
- 当前 git 仓库位于当前仓库根目录。
- 页面入口：`src/app/page.tsx`。
- 状态管理：`src/store/useGameStore.ts`。
- Pixi 画面：`src/components/GameCanvas.tsx`，要求全屏 `fixed inset-0` 并使用 `resizeTo={containerRef}`。
- 调酒交互：`src/components/MixingStation.tsx`。
- 调酒评价：`src/engine/DrinkEvaluator.ts`。
- 酒水库存：`src/data/bar-inventory.ts`。

## 当前验证

- 最近一次合并已解决 Git 冲突并成功推送到 `origin/main`。
- 本轮索引刷新只改文档，尚未重新运行 Web full gate。
- 建议后续验证顺序：
  - `cmd /c npm run compile`
  - `cmd /c npx tsc --noEmit --pretty false`
  - `cmd /c npm run lint`
  - `cmd /c npm run build`

## 当前运行路径

- Day01 QA 主路径：`ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A`。
- Day02 已接入剧情源，但仍建议跑编译和前端流程确认。

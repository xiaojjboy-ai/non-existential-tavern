# 进入项目

```powershell
.\h <role>
```

角色：`admin` / `developer` / `planner`。跑完之前不准编辑文件。

详见 `harness/README.md`。

---

## 语言

不管任何情况任何时间用中文说话。

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 注意

This version has breaking changes. Read `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Repository shape

- 仓库根目录是 Next.js 应用。
- `脚本/` — 剧情 Markdown 源文件。
- `docs/characters/` — 角色设定资料。
- `harness/` — 角色边界 + Hook + 留档。
- `package.json` 在根目录。

## Script format

- UTF-8 Markdown + YAML。
- 正式剧情文件在 `脚本/*.md`，模板以 `模板_` 开头。
- 必须包含 `## 指令层` / `## 对话层` / `## 数据层`。
- 完整规范见 `docs/script-format.md`。
- 改格式必须同步：格式文档、编译器、类型、验证命令。

## Build

```powershell
cmd /c npm run compile    # 脚本/*.md → src/data/plot-data.json
cmd /c npm run dev        # 启动 Next.js（不重新编译剧情）
cmd /c npm run build      # compile + build
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run lint
```

`src/data/plot-data.json` 是生成物，不要手改。

## Runtime wiring

- 页面入口：`src/app/page.tsx`
- 状态管理：`src/store/useGameStore.ts`
- 游戏类型：`src/types/game.ts`
- Pixi 画面：`src/components/GameCanvas.tsx`
- GameCanvas 必须 `fixed inset-0` + `resizeTo={containerRef}` 全屏
- Debug Monitor：`debug-choice` / `debug-affinity` / `debug-runtime`
- Day01 QA 路径：`ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A → ch_01_05=C → ch_01_06=B`

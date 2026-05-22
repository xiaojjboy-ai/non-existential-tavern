<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. The app lives at this repository root; read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 语言

不管任何情况任何时间用中文说话。

## Agent Harness

本项目使用仓库内 `harness/` 作为 opencode、Codex、Claude 等 agent 的简化版 Agent Team Harness。

它不是软文档。agent 必须基于任务票据、文件边界和证据要求行动。

任何 agent 开始工作前，先读：

1. `harness/agent-entry.md`
2. `harness/workflow.md`
3. `harness/protocols/agent-team.md`
4. `harness/current-task.json`
5. `harness/claims.json`
6. `README.md`
7. `docs/script-format.md`

进入项目后建议先跑：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

涉及代码修改时，收尾前至少跑：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop
```

需要完整 Web 门禁时再跑：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage ci
```

严厉纠错规则：可以明确说“你做错了”“这一步不合格”“别跳过验证”，但只批评行为和事实，不做人身攻击。

Drill 三条铁律，对人类和 agent 一视同仁：

1. 你没有通过检查，就没有资格说完成。
2. 没有 evidence，就没有完成。
3. guard 不绿，不准交付。

## Repository shape

- 当前仓库根目录是实际 Next.js 应用和 git 仓库。
- 仓库内 `脚本/` 是剧情 Markdown 源文件目录。
- 仓库内 `docs/characters/` 是当前角色设定资料目录。
- 根目录有 `package.json`；运行 npm 命令在当前仓库根目录执行。

## Script format contract

- 剧情源文件使用 UTF-8 Markdown + YAML。
- 正式剧情文件放在仓库内 `脚本/*.md`。
- 模板文件必须以 `模板_` 开头，编译器会跳过。
- 正式剧情文件必须包含三层标题，顺序固定：
  - `## 指令层`
  - `## 对话层`
  - `## 数据层`
- 完整格式规范见 `docs/script-format.md`。
- 不要随意改变 Markdown 格式；如果确实要改格式，必须同步更新格式文档、编译器、类型和验证命令。

## Build/data flow

- `cmd /c npm run compile` 从仓库内 `脚本/*.md` 生成 `src/data/plot-data.json`。
- `src/data/plot-data.json` 是生成物，但当前阶段继续提交；不要手改。
- `cmd /c npm run dev` 只启动 Next.js，不会自动重新生成剧情 JSON。
- `cmd /c npm run build` 会先 compile 再 build。
- 本项目没有 test script；本地验证使用：
  - `cmd /c npm run compile`
  - `cmd /c npx tsc --noEmit --pretty false`
  - `cmd /c npm run lint`
  - `cmd /c npm run build`

## Runtime wiring

- 页面入口是 `src/app/page.tsx`。
- 状态管理在 `src/store/useGameStore.ts`。
- 游戏数据类型在 `src/types/game.ts`。
- Pixi 占位画面在 `src/components/GameCanvas.tsx`。
- 当前原型已经接通：普通 choice、drink choice、基础 affinity/effect、BG/BGM/ENTER/EXIT/END 的 runtime 占位状态，以及固定路径浏览器验证。
- `GameCanvas` 现在优先读取 store 里的 `runtime.backgroundId`，不是只读 `plot.meta.resources.bg[0]`。
- `GameCanvas` 必须显式全屏：当前正确做法是容器 `fixed inset-0` + `resizeTo={containerRef}`；否则 Pixi canvas 会退回默认 `300x150`，露出大面积白底。
- Debug Monitor 暴露了 `debug-choice`、`debug-affinity`、`debug-runtime`，可用于本地自动化验证。
- Day01 固定 QA 路径：`ch_01_01=C -> ch_01_02=C -> drink_01_01=白酒 -> ch_01_03=B -> ch_01_04=A -> ch_01_05=C -> ch_01_06=B`。
- 页面文本层已做最小清洗：正文会去掉与当前 actor 相同的重复前缀；选项按钮优先显示目标节点首句，不显示内部节点 ID。
- 若看到对白里还残留 `Lendro：`、`酒保：` 这类前缀，先检查 `src/app/page.tsx` 的 `formatNodeText()`，不要先改脚本源。
- 仍然不实现完整演出虚拟机、真实音频/美术资源加载、存档或最终调酒 UI。

## 2026-05-21 本轮完成项

- 修通 Day01 最小可玩流程。
- 修掉 drink choice 死锁。
- 接通 Day01 的 `亲和 / 关切 / 信任` effect。
- 增加 runtime 调试状态和 Debug Monitor 输出。
- 让 Pixi 背景真正铺满全屏。
- 修正文案展示：不再把选项显示成内部节点 ID。
- 浏览器固定路径验证证据位于 `../.sisyphus/evidence/`。

# 20260531-gunshot-effect

**人类负责人**：admin
**角色**：admin
**Agent 工具**：Codex
**接任务**：2026-05-31 - 调整 `[GUNSHOT]` 行内特效，复现屏幕被击中的硬碎裂冲击。
**完成**：2026-05-31 - 强化破碎形变、裂痕高光和后续硬震，并提供专用演示页验证。

## 改了什么
- 调整 `src/app/globals.css` 中 `.effect-gunshot`，改为更长的硬折线碎裂开场、更多段短促硬震，避免大幅横向拉伸。
- 同步延长 `DialogueBox` 中特效清理时间，防止正式剧情里枪击动画被提前清掉。
- 重写 `src/app/debug/effects/page.tsx`，让演示页直接触发正式 CSS 特效，移除单独 JS 回弹干扰。

## 怎么验证
- `cmd /c npx tsc --noEmit --pretty false`
- `cmd /c npm run lint`
- `cmd /c npm run compile`
- `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
- 打开 `http://localhost:3001/debug/effects`，点击 `[ gunshot ]` 检查枪击特效关键帧。

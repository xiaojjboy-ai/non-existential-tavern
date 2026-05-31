# 20260601-dialoguebox-ssr-fix

**人类负责人**：admin
**角色**：admin
**Agent 工具**：Claude Code (Sonnet 4.6)
**接任务**：2026-06-01 — 修复浏览器控制台 hydration mismatch 报错，DialogueBox 在 SSR 与客户端渲染结构不一致
**完成**：2026-06-01 — 用 `next/dynamic` 禁掉 DialogueBox 的 SSR，彻底消除 hydration 错误

## 背景

上一回合（1bce079）对 `DialogueBox.tsx` 做了大规模重构：

- 容器改为 `fixed` 悬浮卡片（`bottom: max(12px, 2vh)`），不再嵌在吧台 33vh 区域内
- 推进层改为全屏 `fixed inset-x-0 bottom-0 z-[60]`，通过 `createPortal` 挂到 `document.body`
- 角色名、正文、选项区布局、padding 全部重新对齐

同回合还加入了枪击特效（0d43291）：`globals.css` 新增 `effect-gunshot`、`animate-gunshot-flash` 等 keyframe，`DialogueBox` 特效清理时间从 ~500ms 延长到 1180ms。

## 本次修复

浏览器报 hydration mismatch：SSR 阶段渲染出旧结构的 HTML，客户端 mount 后与新代码不匹配导致整棵树重建。

**根因**：`DialogueBox` 用了 `createPortal`，SSR 下 `mounted=false` 时仍然渲染了结构体（旧版 className 泄漏到 HTML），与客户端首帧不一致。

**修复方式**（`src/app/page.tsx`）：

```diff
-import { DialogueBox } from '@/components/DialogueBox';
+import dynamic from 'next/dynamic';

+const DialogueBox = dynamic(
+  () => import('@/components/DialogueBox').then(m => ({ default: m.DialogueBox })),
+  { ssr: false }
+);
```

SSR 阶段完全跳过 DialogueBox 渲染，客户端 hydrate 后再插入，结构天然一致。

## 怎么验证

- 重启 dev server（清 `.next` 缓存）后刷新浏览器
- 控制台无 hydration mismatch 报错
- 对话框悬浮卡片正常显示，点击推进流程正常

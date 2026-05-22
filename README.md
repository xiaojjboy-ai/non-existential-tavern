# 非存在主义酒馆 Web 原型

`tavern-web/` 是这个项目的实际前端应用：

- Next.js 16 + React 19 + TypeScript
- Zustand 管理剧情状态
- `@pixi/react` + PixiJS 渲染占位背景
- 仓库内 `脚本/*.md` 是剧情源，`npm run compile` 会生成 `src/data/plot-data.json`

## 目录关系

- `脚本/`：剧情 Markdown + YAML 源文件
- `docs/characters/`：角色设定资料
- `docs/script-format.md`：剧情格式契约
- `scripts/compile-scripts.ts`：脚本编译器
- `src/app/page.tsx`：页面入口
- `src/store/useGameStore.ts`：剧情推进、choice、drink、affinity、runtime 状态
- `src/components/GameCanvas.tsx`：Pixi 占位背景

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

## 脚本编译约束

- 正式剧情文件在仓库内 `脚本/*.md`
- 模板文件必须以 `模板_` 开头，编译器会跳过
- 正式剧情必须包含：
  - `## 指令层`
  - `## 对话层`
  - `## 数据层`
- 完整规范见 `docs/script-format.md`

## 2026-05-21 本轮整理结果

今天完成了这轮“从可构建原型到可最小游玩”的整理：

1. **剧情流程接通**
   - 普通 `choice` 已接通
   - `drink_01_01` 已接通，不再死锁
   - Day01 固定路径可走通：
     - `ch_01_01=C`
     - `ch_01_02=C`
     - `drink_01_01=白酒`
     - `ch_01_03=B`
     - `ch_01_04=A`
     - `ch_01_05=C`
     - `ch_01_06=B`

2. **玩法状态接通**
   - `affinities` 已改成 `affinities[character][field]`
   - 已支持 Day01 当前使用到的 effect：
     - `亲和+1`
     - `关切+1`
     - `信任+1`
   - `null` 和数组 effect 已处理

3. **运行时占位状态接通**
   - 已记录：
     - `backgroundId`
     - `bgmId`
     - `activeSpriteId`
     - `lastCommandRaw`
     - `ended`
   - `GameCanvas` 改为优先读取 `runtime.backgroundId`

4. **文本显示修正**
   - 对话正文会去掉同一说话人的重复前缀，例如正文里不再反复显示 `Lendro：`
   - 选项按钮不再显示内部节点 ID，而是显示目标节点首句预览

5. **画布尺寸修正**
   - Pixi canvas 现在会铺满视口，不再出现默认 `300x150` 导致的大面积白底

6. **自动化验证与证据**
   - 固定路径浏览器验证已跑通
   - 证据保存在外层：`../.sisyphus/evidence/`
   - 关键文件：
     - `task-6-selectors.png`
     - `task-6-day01-playthrough.png`
     - `task-6-console.log`

## 当前仍是原型，不是正式成品

目前已经是**可构建、可最小游玩、可验证**的状态，但仍有明显范围边界：

- 没有正式美术资源加载
- 没有真实音频播放
- 没有完整演出虚拟机
- 没有存档系统
- 调酒 UI 仍是最小原型交互

后续迭代应优先考虑：

1. 对话/动作排版分层
2. 更好的选项文案来源
3. 更完整的命令执行器
4. 正式资源接入

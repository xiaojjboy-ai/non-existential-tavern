# Agent 索引单与规则清单

不管任何情况、任何时间，所有 Agent 必须用中文沟通、记录和编写项目文档。

## 先看索引

- 项目总览：`README.md`
- 当前状态：`harness/project-status/README.md`
- Harness 用法：`harness/README.md`
- Hook 细节：`harness/hook-guide.md`
- Demo 总纲：`docs/00_Demo_总纲.md`（项目最高指示，必须优先阅读）
- 剧情大纲：`docs/01_Demo_剧情大纲.md`
- 角色速查：`docs/02_Demo_角色速查表.md`
- 技术节点：`docs/03_Demo_技术节点大纲.md`
- 剧情格式：`docs/script-format.md`
- 数据契约：`docs/data-contract-v2.md`
- 角色设定细则：`docs/characters/`
- 剧情源文件：`脚本/`

## 开工规则

- 进入项目后先按用户指定身份执行 `.\h <role>`，可选 `admin` / `developer` / `planner`。
- 角色命令跑完之前不准编辑文件。
- 不准自行提权或切换身份；需要变更身份时先问用户。
- 修改权限以 `harness/roles.json` 为准，黑名单优先于白名单。
- 首次克隆或 hook 丢失时执行 `.\h install-hooks`。

## 收工规则

- 交付前必须运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

- 任务结束前必须在 `harness/records/<role>/` 新建或更新任务记录。
- 留档格式参考 `harness/records/_template.md`。
- 未写入物理留档前，禁止宣告任务完成。
- `src/data/plot-data.json` 是生成物，不要手改。

## 构建与验证

```powershell
cmd /c npm run compile
cmd /c npm run dev
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run lint
cmd /c npm run build
```

Next.js 版本有 breaking changes。写 Next.js 代码前先看 `node_modules/next/dist/docs/`，并留意 deprecation notices。

## Runtime 索引

- 页面入口：`src/app/page.tsx`
- 状态管理：`src/store/useGameStore.ts`
- 游戏类型：`src/types/game.ts`
- Pixi 画面：`src/components/GameCanvas.tsx`
- 调酒 UI：`src/components/MixingStation.tsx`
- 调酒评价：`src/engine/DrinkEvaluator.ts`
- 酒水库存：`src/data/bar-inventory.ts`
- Day01 QA 路径：`ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A`

## 剧情规则

- 正式剧情文件在 `脚本/*.md`，模板以 `模板_` 开头。
- 剧情文件必须包含 `## 指令层` / `## 对话层` / `## 数据层`。
- 改格式必须同步：格式文档、编译器、类型、验证命令。
- 负责生成、扩展或修改剧情台词时，必须遵守 `docs/characters/` 下的角色语调和运行规则。

## 写作底线

- 酒保能不说话就不说话，能短就不长；倾听比说话更有力量。
- 角色崩溃时不说教、不安慰，只倒酒。
- 隐喻浅浅一提，绝不点破。
- 严禁角色把 PTSD、抑郁、创伤等心理学术语或内心动机直白挂在嘴边。

## 静态资源规则

- 生成透明背景图层时，原图 prompt 必须包含 `isolated on a solid chroma key green background`。
- 绿幕去底使用：

```powershell
python tools/image_processing/remove_green_background.py <输入绿底原画.png> <输出透明立绘.png>
```

- Alpha 校验使用：

```powershell
python tools/image_processing/check_png_alpha.py <输出透明立绘.png>
```

# init-and-compile-fix

**人类负责人**：奥利维拉
**角色**：admin
**Agent 工具**：Antigravity
**接任务**：2026-05-26 — 初始化拉取项目并配置开发环境
**完成**：2026-05-26 — 修复 h.bat 解析漏洞，修复 compile-scripts.ts 的 character 校验使其支持多角色关联，修复 page.tsx 的 ESLint 警告与 any 转换

## 改了什么

- 修复 `h.bat` 中的括号语法解析漏洞（将 empty 检查和 doctor 检查中的 `(none)` 统一修改为 `none`）。
- 部署 Git pre-commit hooks。
- 修改 `scripts/compile-scripts.ts` 编译器，扩展其对于 `links.related.character` 的类型校验逻辑，使其同时兼容 `string` 及 `string[]` 类型。
- 修复 `src/app/page.tsx` 中 window 全局挂载不纯修改的 ESLint 限制（包裹在 `useEffect` 中），清除未使用的 `DialogueNode` 导入，重构 explicit `any` 为强类型转换。
- 生成绿幕背景紫色猫咪立绘，编写并运行绿幕去底抠图脚本。

## 透明图层作图与抠图技术说明

本次任务针对“生成带透明通道 PNG 立绘”遇到的模型底层仅能输出 JPEG/RGB 格式的限制，建立了高精度自动抠图工作流：

### 1. 原画生成配置
- **图像提示词 (Prompt)**:
  `cutout of a cute purple magic kitten, crooked dark purple wizard hat, glowing crystal pendant, isolated on a solid chroma key green background, 2d game character sprite, high definition`
- **背景设计**: 采用 **Chroma Key 纯绿幕背景**。由于猫咪主体为紫色，绿色与其为最大对比色，这使得抠图时猫咪的眼球、腹部等所有的白色区域都不会被“误抠”（传统白底抠图时，主体上的白色会被识别成背景而挖空）。

### 2. 抠图与 De-spill (去溢色) 算法
- **脚本工具**: `scratch/remove_green_background.py` (已固化留档)
- **防狗牙羽化逻辑**:
  - 计算像素的 `greenness = g - max(r, b)` 作为绿色差值。
  - 大于 `55` 判定为纯绿背景，Alpha 设为 `0` (完全透明)。
  - 在 `20` 至 `55` 之间进行线性插值，映射为 `0-255` 的 Alpha 透明度，保留了极柔和的边缘半透明羽化。
- **De-spill (消除边缘绿反光)**:
  绿幕反光（Spill）会导致抠出后的猫咪边缘带绿。算法对过渡区及邻接区域进行了绿光净化：当 `g > max(r, b)` 时，自动将 g 降为 `max(r, b)` 或是 R、B 的均值。这消除了边缘难看的绿边。

### 3. 处理与转换命令
在终端运行：
```powershell
python tools/image_processing/remove_green_background.py <输入绿底原画.png> <输出透明立绘.png>
```
处理完成后，可运行 `python tools/image_processing/check_png_alpha.py <输出透明立绘.png>` 对生成的 PNG 进行 Alpha 极值和透明像素比重校验。

## 怎么验证

- 运行 `cmd /c h.bat doctor` 以确认 Hook 状态。
- 运行 `cmd /c npm run compile` 成功生成 `src/data/plot-data.json`，没有报错。
- 运行 `cmd /c npx tsc --noEmit --pretty false`，静态检查无报错。
- 运行 `cmd /c npm run lint`，ESLint 静态校验顺利通过。
- 运行 `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`，项目自检通过。

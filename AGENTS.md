# 项目 Agent 通用指导流程 (AGENTS.md)

本文件是所有进入《非存在主义酒馆》项目开展工作的 Agent（如 Antigravity、Claude Code、Codex 等）所必须共同遵守的通用指导规范。

---

## 1. 语言与沟通规范
- **语言**：无论任何情况、任何时间，均必须优先且严格使用 **中文** 进行思考、对话、编写文档及代码注释。

---

## 2. 入场与身份认领 (Role & Permission)
- **设置身份**：进入项目后，第一步必须执行角色认领：
  ```powershell
  .\h <role>
  ```
  可选角色：`admin` (管理员) / `developer` (开发人员) / `planner` (策划人员)。
- **🚨 赋权安全硬约束**：
  Agent **严禁**在未经与用户探讨和确认的情况下，自行运行命令认领角色或进行身份提权。在检测到 `no role set` 或需要变更身份时，必须停下向人类用户请示，在人类指定角色后方可执行。

---

## 3. 角色修改边界 (Roles Definition)
所有文件修改权限受 `harness/roles.json` 定义的边界硬性约束，规则为“黑名单 (`forbidden`) 优先级高于白名单 (`allowed`)”：
- **`admin`**：允许修改全部文件。
- **`developer`**：允许修改 `src/`、`scripts/`、`tools/`、`public/`、`docs/` 及配置文件，**绝对禁止**修改 `脚本/`、`harness/policy/` 等。
- **`planner`**：允许修改 `脚本/`、`docs/` 等，**绝对禁止**修改前端代码、编译器及安全策略文件。

---

## 4. 安全防护与门禁验证 (Security & Gate)
- **唯一通用硬防线 (Git Commit Hook)**：
  首次克隆仓库后，必须运行 `.\h install-hooks` 将 Hook 安装到 `.git/hooks` 中。在 `git commit` 时，该 Hook 会物理拦截任何越界的文件改动，不通过则拒绝提交。
- **交付自检门禁**：
  任务结束或交付前，必须运行本地自检门禁以确保合规：
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
  ```

---

## 5. 开发与构建验证工作流 (Build & Verify)
在工作区根目录下，优先使用以下命令进行编译、检查与构建：
```powershell
cmd /c npm run compile    # 脚本编译：将 脚本/*.md 编译成 src/data/plot-data.json
cmd /c npm run dev        # 启动本地开发服务（不重新编译剧情）
cmd /c npx tsc --noEmit --pretty false # TS 静态类型安全检查
cmd /c npm run lint       # 代码风格与质量校验
cmd /c npm run build      # compile + build 完整打包构建
```
*注意：`src/data/plot-data.json` 是自动编译生成物，严禁手动修改。*
<!-- BEGIN:nextjs-agent-rules -->
### Next.js 注意
This version has breaking changes. Read `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

### Repository shape
- 仓库根目录是 Next.js 应用。
- `脚本/` — 剧情 Markdown 源文件。
- `docs/characters/` — 角色设定资料。
- `harness/` — 角色边界 + Hook + 留档。
- `package.json` 在根目录。

### Script format
- UTF-8 Markdown + YAML。
- 正式剧情文件在 `脚本/*.md`，模板以 `模板_` 开头。
- 必须包含 `## 指令层` / `## 对话层` / `## 数据层`。
- 完整规范见 `docs/script-format.md`。
- 改格式必须同步：格式文档、编译器、类型、验证命令。

### Runtime wiring
- 页面入口：`src/app/page.tsx`
- 状态管理：`src/store/useGameStore.ts`
- 游戏类型：`src/types/game.ts`
- Pixi 画面：`src/components/GameCanvas.tsx`
- GameCanvas 必须 `fixed inset-0` + `resizeTo={containerRef}` 全屏
- Debug Monitor：`debug-choice` / `debug-affinity` / `debug-runtime`
- Day01 QA 路径：`ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A → ch_01_05=C → ch_01_06=B`


## 6. Records 留档机制 (Records Requirement)
**注意：本项为硬性规定，任务结束前必须执行。**
每次执行任务必须在对应角色路径下留下简易工作记录（模板见 `harness/records/_template.md`）：
- 存储路径：`harness/records/<role>/<task-id>.md`
- **接任务时**：创建该文件，填写修改意图。
- **交付前**：补全完成项、验证结果和证据，**未写入物理留档前，禁止宣告任务结束！**

详见 `harness/README.md`。

---

## 7. 静态资源（透明立绘）作图与去底指南
如果任务涉及生成透明背景图层（例如角色立绘、猫咪立绘或道具图层），由于大多数图片生成模型仅能直接输出不带 Alpha 通道的 `JPEG/RGB` 格式且纯白抠图容易误伤主体白色，所有 Agent 必须遵守以下作图与去底工作流：
1. **原图生成**：
   在 Prompt 中明确包含 `isolated on a solid chroma key green background`。必须使用绿幕作为对比背景，以防在抠图时伤及角色主体本身的白色区域（如眼睛高光、眼白等）。
2. **执行绿幕去底与溢色滤除**：
   在根目录下运行以下项目级命令，使用带羽化和 De-spill（抑制绿边溢色）的算法对原画进行抠图去底处理：
   ```powershell
   python tools/image_processing/remove_green_background.py <输入绿底原画.png> <输出透明立绘.png>
   ```
3. **真实性通道校验**：
   处理完成后，必须运行校验脚本对生成的 PNG 文件的 Alpha 通道和透明像素占比进行实测校验，必须满足 `PASS` 状态方可导入 `public/assets/` 中：
   ```powershell
   python tools/image_processing/check_png_alpha.py <输出透明立绘.png>
   ```

## 8. 角色写作规则 (Writing Rules for Agents)

任何负责生成、扩展或修改剧情台词的 Agent，必须绝对遵守以下角色语调和人设（严禁 OOC）：

**1. 访客说话特点：**
- **警探 (Lendro)**: 短句，硬朗，克制。示例：`……还开着？`
- **赌徒**: 紧张，急促，偶尔炫耀。示例：`我跟你说，上次在东北角……`
- **死神**: 优雅，从容，像在陈述事实。示例：`墙只是在那里。`
- **猫女 (小女孩)**: 语焉不详，碎片化。示例：`……重……不知道……`
- **猫女 (少女)**: 多疑，犀利，反问。示例：`你是那个想带走我的傻子？`
- **猫女 (中年)**: 偏执，成熟，有锋芒。示例：`我只觉得……重。`
- **牛仔**: 豪爽，嘴硬，粗犷带疲惫。示例：`我活着就是一切。`
- **维修师**: 实在，不纠结，偶尔热情。示例：`啤酒。只有啤酒。`
- **僵尸**: 极简，不超过5岁智力水平。示例：`……我……是谁？`
- **哲学神**: 平静，像在讲一个很长的故事。示例：`你知道这个世界是怎么来的吗？`

**2. 酒保 (玩家) 写作核心准则：**
能不说话就不说话，能短就不长。**倾听比说话更有力量。**
- 角色进门/告别：一句话或点头沉默。
- 角色讲故事：不打断，最多做个倒酒的动作。
- 角色崩溃时：**不说教，不安慰**，只倒酒。绝对禁止像心理医生一样的鸡汤式安慰与指点。

**3. 隐喻与潜台词：**
隐喻应如草蛇灰线，借物喻人，浅浅一提且绝不点破。
- **示例**：用"天气"、"道具"暗指人物的创伤（如：`怀表停了上千次时间，却没有一次能停下来让我喘口气。`）
- **禁止**：严禁角色自己把心理学术语（如 PTSD、抑郁、创伤）或者内心动机直白地挂在嘴边。


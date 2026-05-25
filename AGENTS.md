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

## 角色写作规则 (Writing Rules for Agents)

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
- **示例**：用“天气”、“道具”暗指人物的创伤（如：`怀表停了上千次时间，却没有一次能停下来让我喘口气。`）
- **禁止**：严禁角色自己把心理学术语（如 PTSD、抑郁、创伤）或者内心动机直白地挂在嘴边。

## 常见坑点与排雷 (Troubleshooting)

**1. Windows 中文路径下的 Git Hook 乱码阻断**
如果项目所在的根目录含有中文字符（如 `非存在主义酒馆`），触发 `git commit` 时，`harness/hooks/pre-commit.ps1` 和 `guard.ps1` 可能会因为 PowerShell 默认编码问题读取到乱码路径（表现为找不到 `XXX?XXX?` 路径的 `ItemNotFoundException`），从而强行阻断提交流程。
- **解决方案**：在确保代码已经通过了手动的 `npx tsc` 和 `npm run lint` 验证后，直接使用 `git commit --no-verify -m "..."` 命令提交，强行跳过损坏的 Hook 检查。

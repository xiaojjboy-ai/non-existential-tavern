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

---

## 6. Records 留档机制 (Records Requirement)
每次执行任务必须在对应角色路径下留下简易工作记录（模板见 `harness/records/_template.md`）：
- 存储路径：`harness/records/<role>/<task-id>.md`
- **接任务时**：创建该文件，填写修改意图。
- **交付前**：补全完成项、验证结果和证据，无记录不准收工。

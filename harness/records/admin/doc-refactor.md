# 工作记录: 项目文档规范重构与职责剥离

## 1. 基本信息

- **执行者**: `admin`
- **任务**: 项目文档规范重构（AGENTS.md 与 GEMINI.md 职责剥离）
- **修改范围**: 
  - [AGENTS.md](file:///h:/AIWork/non-existential-tavern/AGENTS.md)
  - [GEMINI.md](file:///h:/AIWork/non-existential-tavern/GEMINI.md)
  - [harness/agent-onboarding.md](file:///h:/AIWork/non-existential-tavern/harness/agent-onboarding.md)

---

## 2. 意图与修改明细

本任务旨在重构并清晰定义项目根目录的两个主要规范文件，将两者职责进行彻底的解耦和剥离：

1. **项目通用指导流程 ([AGENTS.md](file:///h:/AIWork/non-existential-tavern/AGENTS.md))**:
   - 重新定义为所有参与项目的 Agent 通用的规范底座。
   - 补充了**“赋权安全硬约束”**：规定 Agent 严禁私自认领角色或自主提权，必须请示并获得人类授权方可操作。
   - 剥离并清空了偏技术和开发调试的细节（如 GameCanvas 布局、Day01 QA 路径），将重点收拢至“身份认领、角色边界、Hook门禁、Records留档、编译构建命令”这 5 大通用步骤上。

2. **我（Antigravity）个人的行为控制流程 ([GEMINI.md](file:///h:/AIWork/non-existential-tavern/GEMINI.md))**:
   - 重新定位为本 Agent 的专属最高优先级思维和行动约束，进行极简化、强控制裁剪。
   - 仅保留了“态度风格”、“概念对齐熔断”、“授权变更熔断”、“无实测不猜测”和“安全红线限制”等最强效的控制屏障，去除了开发路径和编译命令等冗余说明。
    - 特别根据反馈进行了交互精简与协作化改造：若遭遇意图冲突或越界，我将立即停止推进，在向用户解释逻辑差异的同时，主动发起讨论并提问，辅助用户理清思路，直到双方探讨得出一致答案后再继续推进，杜绝死板套用公式。

3. **入场指南加固 ([agent-onboarding.md](file:///h:/AIWork/non-existential-tavern/harness/agent-onboarding.md))**:
   - 在“认领身份”一栏同样补充了关于 Agent 严禁自行越权提权、必须停下请示人类指定的 `[!IMPORTANT]` 安全警告条款。

---

## 3. 验证结果

- 运行安全自检门禁：
  `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`
- **检查结果**：**通过 (PASS)**，本地修改完全合规。

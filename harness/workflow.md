# 固定工作流

这份流程是所有 agent 的默认工作流。用户明确要求跳过时，以用户要求为准；否则按这里走。

## 1. Intake：接任务

先判断任务类型：

- 只问问题：读相关文件后直接回答。
- 要计划：产出简洁计划，不改代码。
- 要实现：直接进入实现流程，不停在建议层。
- 要审查：按 code review 口径，先列风险和问题，再列摘要。

接任务时确认：

- `.agent-harness/current-task.json` 是否存在。
- 当前任务允许修改哪些文件。
- 当前任务禁止修改哪些文件。
- 任务影响范围：剧情、编译器、运行时、UI、构建配置、文档。
- 是否需要浏览器验证。
- 是否会碰生成物、锁文件或外部依赖。

## 2. Context：读上下文

最小读取集：

- `AGENTS.md`
- `harness/agent-entry.md`
- `harness/workflow.md`
- `harness/protocols/agent-team.md`
- `harness/current-task.json`
- `harness/claims.json`
- 与任务直接相关的源码或文档

不要靠猜。看到不确定的路径、命令或契约，先查本地文件。

## 3. Init Hooks：初始化 Hook

每个 agent 或人类成员进入项目后，必须完成自己的 hook 初始化检查。

最低要求：

- 能接 hook 的工具必须接。
- 不能接 hook 的工具必须在工作记录里说明原因。
- hook 命令统一指向 `harness/policy/guard.ps1`。

推荐映射：

- 启动/开工：`-Stage inspect`
- 停止/交付：`-Stage pre-stop`
- commit：`-Stage pre-commit`
- push/CI：`-Stage ci`

不要把 hook 当可选项。hook 是门禁自动化入口。

## 4. Plan：定小步

复杂任务用三到五步即可：

1. 锁定现状。
2. 修改最小必要文件。
3. 运行最小验证。
4. 必要时补文档。
5. 完整收口。

计划不是摆设。执行过程中发现事实变化，要更新判断。

## 5. Implement：实现

实现规则：

- 只能改当前任务 `allowed_files` 中的文件。
- 不能改当前任务 `forbidden_files` 中的文件。
- 保持改动小而集中。
- 不做用户没要求的重构。
- 不扩写剧情，不制作正式资源，除非用户明确要求。
- 不直接编辑 `src/data/plot-data.json`。
- 若修改脚本格式，必须同步检查：
  - `docs/script-format.md`
  - `scripts/compile-scripts.ts`
  - `src/types/game.ts`
  - 编译与验证命令

## 6. Verify：验证

按影响范围选择验证：

- 剧情或编译器：`cmd /c npm run compile`
- TypeScript：`cmd /c npx tsc --noEmit --pretty false`
- React / lint：`cmd /c npm run lint`
- 构建收口：`cmd /c npm run build`
- 交互行为：启动 dev server 后做浏览器路径验证

常用命令在当前仓库根目录执行。

## 7. Evidence：留证据

较复杂任务把证据放到 workspace root：

- `.sisyphus/evidence/`

Harness 自身任务也可以把证据放到：

- `harness/evidence/`

证据可以是：

- 命令输出摘要
- 截图
- console log
- 简短验证记录

没有证据，不准说完成。

## 8. Drill：严厉纠错

当 agent 或开发者违反任务票据时，直接指出：

- 你做错了哪一步。
- 哪个文件越界了。
- 缺哪份证据。
- 应该立刻怎么补。

不要做人身攻击。错误反馈必须对准行为和事实。

## 9. Handoff：交接

最终回复不要写成长篇教程。优先说明：

- 完成项。
- 修改文件。
- 验证结果。
- 仍然存在的限制或下一步。

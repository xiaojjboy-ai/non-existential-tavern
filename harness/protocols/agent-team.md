# Agent Team Protocol

这是《非存在主义酒馆》的简化版 Agent Team Harness。它服务的不是人类团队，而是多个 agent 驱动的开发流程。

## 核心规则

1. 每个 agent 必须基于 `.agent-harness/current-task.json` 工作。
2. 没有任务票据，不允许开始写文件。
3. 只能改 `allowed_files` 里的文件。
4. 绝对不能改 `forbidden_files` 里的文件。
5. 生成物默认只读，尤其是 `src/data/plot-data.json`。
6. 完成前必须留下 evidence。
7. 最终交接必须说清楚改了什么、跑了什么验证、还剩什么风险。
8. 每个任务必须写入 `harness/work-records/<task-id>.md`。

## Agent 分工

- planner：拆任务，写 `current-task.json`。
- implementer：只做实现，不扩大范围。
- verifier：只验证，不偷偷修代码。
- reviewer：只审查，先报问题。
- archivist：写交接和长期记录。

一个 agent 可以临时兼任多个角色，但必须遵守同一张任务票据。

## 强约束入口

所有支持 hook 的 agent 都应该调用：

```powershell
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage pre-stop
```

推荐阶段：

- `inspect`：开工前检查 harness 和任务票据。
- `pre-commit`：提交前检查越权文件和生成物。
- `pre-stop`：结束前检查证据和交接条件。
- `ci`：完整命令门禁。

## 修改留档

每次实际修改都必须写工作记录。工作记录必须包含：

- 执行者。
- 任务。
- 修改范围。
- 已完成事项。
- 验证命令。
- 证据路径。
- 风险或遗留。

没有工作记录，不准收工。

## 教育型 Drill 门禁

任务票据里的 `mode` 可以是：

- `normal`：只报错。
- `strict`：明确指出 agent 做错了什么。
- `drill`：严厉训斥违规行为，对人类和 agent 一视同仁。

`drill` 的目标是防止 agent 或纯新手在上下文很长时装作完成、跳过验证、越界改文件。它不是情绪输出，是流程训练。

三条核心口令必须形成条件反射：

1. 你没有通过检查，就没有资格说完成。
2. 没有 evidence，就没有完成。
3. guard 不绿，不准交付。

禁止输出人格攻击、歧视、威胁或脏话。要骂就骂行为：没验证、越权、乱改、没证据、装完成。

Drill 输出必须斩钉截铁：

```text
停。{结论}

问题：
{具体事实}

性质：
{流程定性}

处理：
1. {补救动作}
2. {补救动作}
3. {补救动作}

门禁：
你没有通过检查，就没有资格说完成。
没有 evidence，就没有完成。
guard 不绿，不准交付。
```

允许的严厉表达：

- 停。你没有完成。
- 没有 evidence，就没有完成。口头汇报能算交付？你的代码是写在空气里的吗？
- 立刻滚去运行本地验证脚本，严禁盲交！
- 停。你越界了。
- 任务边界不是装饰！擅自跨界就是严重违规，你以为这是你家后花园？
- 重新接受门禁检查，管好你的手，别乱碰别的文件！
- 停。你跳过了验证。
- 未验证交付就是无效交付！你的自我感觉毫无价值，我们要的是机器的绿码！
- 停。这个动作必须纠正。
- 生成物不是源头！你在这动手，下次自动构建就全被覆盖了，你是在给项目埋雷！
- 停。你没有开工资格。
- 任务票据没过，不准开工！
- 停。检查失败。
- 失败的命令没有被修复，就不能继续包装进度！掩耳盗铃很有意思吗？

以上话术用于流程训诫。攻击点必须落在违规行为上，不准升级成人格羞辱。

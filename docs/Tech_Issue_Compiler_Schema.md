# 技术侧需求/Bug修复清单：数据层 schema 不一致死锁

**提交人**：文案策划组
**时间**：2026-05-26
**优先级**：P0 (直接导致全部剧本无法编译)

## 问题描述

在最新的代码合并后，系统存在两套相互冲突的编译校验标准，导致策划在编写剧本时陷入死锁：

1. `tools/harness/harness.ts` (Precompile): 
   验证脚本要求 `branches` 和 `drink` 的选项中必须使用 `gotoNodeId` 字段。如果写了老的 `goto`，它会报错指向空节点。
2. `scripts/compile-scripts.ts` (主编译器/Zod):
   仍然期望读取旧的 `goto` 字段。如果按 Harness 要求只写了 `gotoNodeId`，Zod 验证会报错 `期望 string，实际 undefined`。

这导致原有的 `Day01_警探` 和 `Day02_维修师` 等已写好的剧本在运行 `npm run compile` 时全部报错。

## 临时绕过方案（策划侧）

为了不影响文案侧的剧本编写与预编译测试，我们在 `Day01`、`Day02`、`Day04` 的 YAML 数据层中同时保留了两个字段，例如：

```yaml
branches:
  ch_04_01:
    A:
      gotoNodeId: dlg_04_03a
      goto: dlg_04_03a
```
目前的剧本使用这种双重声明的方式，已经可以 100% 成功通过 `npm run compile`（0 error）。

## 技术侧需要做的修复（TODO）

1. **统一 Schema**：请技术侧决定到底使用 `goto` 还是 `gotoNodeId`（目前看来 `game.ts` 和 `模板_数据层.md` 里定的是 `gotoNodeId`）。
2. **同步编译器代码**：请同步更新 `scripts/compile-scripts.ts` 中的解析与 Zod 校验逻辑，让它与 `tools/harness/harness.ts` 的校验标准完全对齐。
3. **（可选）清理双写字段**：在编译器修复后，可以使用脚本将 Markdown 里的老 `goto` 字段全部批量移除。
4. **系统门禁与生成的 JSON**：`npm run compile` 默认会自动更新 `src/data/plot-data.json`。但当前权限策略下 `planner` 不能修改 `src/`。请技术侧评估是否将 `plot-data.json` 移出受限区，或将编译产物纳入自动 CI 流程而不是让策划在本地编译后提交。
5. **Git 中文路径乱码**：建议技术侧将 `git config core.quotepath false` 设为项目的全局或初始化配置，避免 `guard.ps1` 将八进制乱码误判为越权修改。

以上，请技术负责人在下次提交时一并修复。目前的 `Day04_维修师_第2次` 剧本已经撰写并双写编译通过，可以随时体验或合并。

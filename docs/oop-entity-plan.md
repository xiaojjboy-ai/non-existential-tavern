# 面向对象实体架构 (OOP Entity System) 实施与工作流落地计划

为了支持复杂的剧情系统（如：动态演变的状态机），我们将构建一套基于“数据黑板（Zustand） + 外部实体管理器（EntityManager）”的类对象架构。同时，严格按照项目《AGENTS.md》规定的工作流和记录规范进行推进。

## 核心技术架构：实体基类设计

1. **`BaseEntity` (基类)**：负责代理读写 Zustand 裸数据，暴露 `checkTriggers()` 钩子。
2. **`CompanionEntity` & `GuestEntity` (子类)**：实现多态的触发器推演。
3. **`EntityManager` (管理器)**：维护活跃实例对象池，并在剧情节点流转时广播状态变更。
4. **数据契约（Data Contract）对齐**：在 `docs/data-contract-v2.md` 中正式确定实体触发器机制。

---

## 实施步骤 (Proposed Changes)

为了保证项目的绝对合规，后续开发将严格遵从以下 5 步流程：

### 第一步：任务留档 (Records)
在开始写代码前，先在当前角色的记录目录下创建任务跟踪文件：
- `harness/records/developer/task-oop-entity-system.md`：记录本次类对象设计的意图。

### 第二步：对齐与更新数据契约
- `docs/data-contract-v2.md`：加入“多实体状态机”规范，指导策划如何正确写 `trigger`。
- `脚本/模板_数据层.md`：同步更新给策划看的 YAML 结构规范。

### 第三步：编写核心架构代码
- `src/game/entities/BaseEntity.ts`：实现数据代理读写。
- `src/game/entities/CompanionEntity.ts`：实现紫猫等特定伴生角色的判定。
- `src/game/EntityManager.ts`：实现实体对象池调度。
- `src/store/useGameStore.ts`：桥接底层数据与外部实体管理器。
- `src/types/game.ts`：补充相关类型的 TS 接口。

### 第四步：编译与脚本检查 (Build & Validate)
代码写完后，在终端执行以下核心命令，确保类型和剧本都能跑通：
- 运行 `npm run compile` 检查并重新编译所有剧本 YAML。
- 运行 `npx tsc --noEmit --pretty false` 验证全项目 TypeScript 类型安全。
- 运行 `npm run lint` 确保代码风格合规。

### 第五步：交付自检门禁 (Guard Gate)
最后，在交付前，主动运行以下命令以通过项目底线防线：
- `powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect`

---

## 验证计划 (Verification Plan)

### 自动化验证与自检
- 通过上述的所有 NPM 构建脚本和 `guard.ps1` 脚本的输出绿灯。

### 手动功能验证
- 在 `useGameStore.ts` 中触发一次模拟的紫猫好感度增加，通过 Log 确认 `EntityManager` 正确拦截、调用了 `checkTriggers()`，并将紫猫的阶段（Stage）推向下一级，最终安全地写回到 Zustand 内存中。

# Task Brief

## 目标

一句话说明这次要达成什么。

## 范围

- 会修改：
- 不会修改：

## 必读

- `AGENTS.md`
- `.agent-harness/agent-entry.md`
- `.agent-harness/workflow.md`

## 执行步骤

1. 
2. 
3. 

## 验证

```powershell
cmd /c npm run compile
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run lint
cmd /c npm run build
```

## 犯错处理与补救

如果 `guard.ps1` 拦截，先认清事实：

1. 停止辩解。Drill 只看客观事实，不看主观解释。
2. 定位性质。对照“性质”一栏，看清触碰了哪条红线。
3. 精准补救。按“处理”逐条执行，直到 guard 变绿。

三条铁律：

- 你没有通过检查，就没有资格说完成。
- 没有 evidence，就没有完成。
- guard 不绿，不准交付。

## 交接

- 改了什么：
- 验证结果：
- 风险或遗留：

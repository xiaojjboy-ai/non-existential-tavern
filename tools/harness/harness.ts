import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_DIR = path.join(PROJECT_ROOT, '脚本');
const RUN_DIR = path.join(PROJECT_ROOT, 'harness-runs');
const LAYER_NAMES = ['指令层', '对话层', '数据层'] as const;
const COMMAND_TYPES = ['BG', 'BGM', 'SE', 'LIGHT', 'PROP', 'ENTER', 'EXIT', 'EMO', 'PAUSE', 'GOTO', 'CHOICE', 'END'] as const;

type LayerName = (typeof LAYER_NAMES)[number];
type CommandType = (typeof COMMAND_TYPES)[number];

interface HarnessIssue {
  severity: 'error' | 'warning';
  file: string;
  layer?: LayerName;
  message: string;
}

interface HarnessResult {
  harness_result: {
    task_type: string;
    target: string;
    context_pack: {
      loaded: string[];
      missing: string[];
    };
    generated_artifacts: string[];
    validation: {
      passed: boolean;
      errors: number;
      warnings: number;
    };
    blockers: HarnessIssue[];
    next_action: string;
  };
}

interface ParsedCommands {
  gotoTargets: string[];
  choiceIds: string[];
  choiceRoutes: Record<string, Record<string, string>>;
}

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/');
}

function addIssue(issues: HarnessIssue[], issue: HarnessIssue) {
  issues.push(issue);
}

function formatIssue(issue: HarnessIssue) {
  const layer = issue.layer ? ` / ${issue.layer}` : '';
  return `[${issue.severity.toUpperCase()}] ${issue.file}${layer}: ${issue.message}`;
}

async function exists(relativePath: string) {
  return fs.pathExists(path.join(PROJECT_ROOT, relativePath));
}

async function loadContextPack() {
  const required = [
    'package.json',
    'docs/script-format.md',
    'docs/data-contract-v2.md',
    'scripts/compile-scripts.ts',
    'src/types/game.ts',
    '脚本/模板_脚本层.md',
    '脚本/模板_指令层.md',
    '脚本/模板_对话层.md',
    '脚本/模板_数据层.md',
  ];

  const loaded: string[] = [];
  const missing: string[] = [];
  for (const item of required) {
    if (await exists(item)) loaded.push(item);
    else missing.push(item);
  }

  return { loaded, missing };
}

function parseLayers(file: string, content: string, issues: HarnessIssue[]) {
  const headerMatches = [...content.matchAll(/^##\s*(指令层|对话层|数据层)\s*$/gm)];
  const layers: Partial<Record<LayerName, string>> = {};

  if (headerMatches.length === 0) {
    addIssue(issues, { severity: 'error', file, message: '缺少三层标题：## 指令层 / ## 对话层 / ## 数据层。' });
    return null;
  }

  const ordered = headerMatches.map((match) => match[1]);
  const expectedOrder = LAYER_NAMES.join(' -> ');
  const actualOrder = ordered.join(' -> ');
  if (actualOrder !== expectedOrder) {
    addIssue(issues, { severity: 'error', file, message: `三层顺序必须是 ${expectedOrder}，当前是 ${actualOrder}。` });
  }

  for (const layerName of LAYER_NAMES) {
    const match = headerMatches.find((candidate) => candidate[1] === layerName);
    if (!match) {
      addIssue(issues, { severity: 'error', file, layer: layerName, message: `缺少 ## ${layerName}。` });
      continue;
    }
    const start = match.index + match[0].length;
    const next = headerMatches.find((candidate) => candidate.index > match.index);
    layers[layerName] = content.slice(start, next?.index ?? content.length).replace(/^---\s*$/gm, '').trim();
  }

  if (!LAYER_NAMES.every((layerName) => typeof layers[layerName] === 'string')) return null;
  return layers as Record<LayerName, string>;
}

function parseCommands(file: string, section: string, issues: HarnessIssue[]): ParsedCommands {
  const gotoTargets: string[] = [];
  const choiceIds: string[] = [];
  const choiceRoutes: Record<string, Record<string, string>> = {};
  let activeChoiceId: string | null = null;

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '```') continue;

    const commandMatch = trimmed.match(/^\[(\w+)(?:\s+([^\]]+))?\]$/);
    if (commandMatch) {
      const type = commandMatch[1] as CommandType;
      const params = (commandMatch[2] ?? '').trim();
      if (!COMMAND_TYPES.includes(type)) {
        addIssue(issues, { severity: 'error', file, layer: '指令层', message: `不支持的指令：[${commandMatch[1]}]。` });
        activeChoiceId = null;
        continue;
      }
      if (type !== 'END' && !params) {
        addIssue(issues, { severity: 'error', file, layer: '指令层', message: `[${type}] 缺少参数。` });
      }
      if (type === 'GOTO') gotoTargets.push(params);
      if (type === 'CHOICE') {
        choiceIds.push(params);
        choiceRoutes[params] = {};
        activeChoiceId = params;
      } else {
        activeChoiceId = null;
      }
      continue;
    }

    if (!activeChoiceId) continue;
    const routeMatch = trimmed.match(/^(.+?)\s*(?:→|->)\s*([A-Za-z0-9_]+)(?:\s+.*)?$/);
    if (routeMatch) {
      choiceRoutes[activeChoiceId][routeMatch[1].trim()] = routeMatch[2].trim();
    }
  }

  return { gotoTargets, choiceIds, choiceRoutes };
}

function parseDialogueIds(file: string, section: string, issues: HarnessIssue[]) {
  const ids = [...section.matchAll(/^\[(dlg_[A-Za-z0-9_]+|narr_[A-Za-z0-9_]+)\]\s*$/gm)].map((match) => match[1]);
  if (ids.length === 0) {
    addIssue(issues, { severity: 'error', file, layer: '对话层', message: '没有找到任何 [dlg_*] 或 [narr_*] 节点。' });
  }
  return new Set(ids);
}

function parseDataLayer(file: string, section: string, issues: HarnessIssue[]) {
  const yamlMatch = section.match(/```yaml\s*([\s\S]*?)```/) ?? section.match(/```\s*([\s\S]*?)```/);
  if (!yamlMatch) {
    addIssue(issues, { severity: 'error', file, layer: '数据层', message: '数据层必须包含 fenced YAML 代码块。' });
    return null;
  }
  try {
    const parsed = yaml.load(yamlMatch[1]);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      addIssue(issues, { severity: 'error', file, layer: '数据层', message: 'YAML 顶层必须是对象。' });
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    addIssue(issues, { severity: 'error', file, layer: '数据层', message: `YAML 解析失败：${error instanceof Error ? error.message : String(error)}` });
    return null;
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function validateFilenameMeta(file: string, data: Record<string, unknown>, issues: HarnessIssue[]) {
  if (file.startsWith('DayPost_')) return;
  const dayMatch = file.match(/^Day(\d{2})_/);
  if (!dayMatch) {
    addIssue(issues, { severity: 'error', file, message: '正式脚本文件名必须以 DayXX_ 开头，或使用 DayPost_。' });
    return;
  }
  const meta = getRecord(data.meta);
  if (!meta) {
    addIssue(issues, { severity: 'error', file, layer: '数据层', message: '缺少 meta。' });
    return;
  }
  const metaDay = String(meta.day ?? '').padStart(2, '0');
  if (metaDay !== dayMatch[1]) {
    addIssue(issues, { severity: 'error', file, layer: '数据层', message: `meta.day=${String(meta.day)} 与文件名 Day${dayMatch[1]} 不一致。` });
  }
  for (const key of ['character', 'visit', 'requires', 'unlocks', 'next', 'resources']) {
    if (!(key in meta)) {
      addIssue(issues, { severity: 'error', file, layer: '数据层', message: `meta 缺少字段 ${key}。` });
    }
  }
}

function validateCrossLayer(file: string, commands: ParsedCommands, dialogueIds: Set<string>, data: Record<string, unknown>, issues: HarnessIssue[]) {
  for (const target of commands.gotoTargets) {
    if (!dialogueIds.has(target)) {
      addIssue(issues, { severity: 'error', file, layer: '指令层', message: `[GOTO ${target}] 指向不存在的对话/旁白节点。` });
    }
  }

  const branches = getRecord(data.branches) ?? {};
  const drink = getRecord(data.drink);
  const drinkId = typeof drink?.id === 'string' ? drink.id : null;

  for (const choiceId of commands.choiceIds) {
    if (!(choiceId in branches) && choiceId !== drinkId) {
      addIssue(issues, { severity: 'error', file, layer: '指令层', message: `[CHOICE ${choiceId}] 未在 branches 或 drink.id 中定义。` });
    }
  }

  for (const [branchId, branchValue] of Object.entries(branches)) {
    const branchRecord = getRecord(branchValue);
    if (!branchRecord) continue;
    for (const [choiceKey, choiceValue] of Object.entries(branchRecord)) {
      const choiceRecord = getRecord(choiceValue);
      const goto = typeof choiceRecord?.goto === 'string' ? choiceRecord.goto : '';
      if (!goto || !dialogueIds.has(goto)) {
        addIssue(issues, { severity: 'error', file, layer: '数据层', message: `branches.${branchId}.${choiceKey}.goto 指向不存在节点：${goto || '(空)'}` });
      }
      const scriptedGoto = commands.choiceRoutes[branchId]?.[choiceKey];
      if (scriptedGoto && goto && scriptedGoto !== goto) {
        addIssue(issues, { severity: 'error', file, layer: '数据层', message: `指令层 ${branchId}.${choiceKey} -> ${scriptedGoto}，数据层写的是 ${goto}。` });
      }
    }
  }

  if (drink) {
    const available = Array.isArray(drink.available) ? drink.available.map(String) : [];
    const correct = typeof drink.correct === 'string' ? drink.correct : '';
    if (correct && !available.includes(correct)) {
      addIssue(issues, { severity: 'error', file, layer: '数据层', message: `drink.correct ${correct} 不在 drink.available 中。` });
    }
    const wrongEffects = getRecord(drink.wrong_effects) ?? {};
    for (const [drinkName, effectValue] of Object.entries(wrongEffects)) {
      const effect = getRecord(effectValue);
      const dialogue = typeof effect?.dialogue === 'string' ? effect.dialogue : '';
      if (!dialogue || !dialogueIds.has(dialogue)) {
        addIssue(issues, { severity: 'error', file, layer: '数据层', message: `drink.wrong_effects.${drinkName}.dialogue 指向不存在节点：${dialogue || '(空)'}` });
      }
    }
  }
}

async function validateScripts(issues: HarnessIssue[]) {
  const files = await glob('*.md', { cwd: SCRIPT_DIR });
  const scriptFiles = files.filter((file) => !file.startsWith('模板_'));

  if (scriptFiles.length === 0) {
    addIssue(issues, { severity: 'error', file: '脚本/', message: '没有正式 DayXX 脚本文件。' });
  }

  for (const file of scriptFiles) {
    if (file === '.gitkeep') continue;
    const fullPath = path.join(SCRIPT_DIR, file);
    const content = await fs.readFile(fullPath, 'utf8');
    const layers = parseLayers(file, content, issues);
    if (!layers) continue;
    const commands = parseCommands(file, layers['指令层'], issues);
    const dialogueIds = parseDialogueIds(file, layers['对话层'], issues);
    const data = parseDataLayer(file, layers['数据层'], issues);
    if (!data) continue;
    validateFilenameMeta(file, data, issues);
    validateCrossLayer(file, commands, dialogueIds, data, issues);
  }
}

async function main() {
  const taskType = process.argv.includes('--task') ? process.argv[process.argv.indexOf('--task') + 1] : 'precompile';
  const target = process.argv.includes('--target') ? process.argv[process.argv.indexOf('--target') + 1] : 'all';
  const issues: HarnessIssue[] = [];
  const context = await loadContextPack();

  for (const missing of context.missing) {
    addIssue(issues, { severity: 'error', file: missing, message: 'required context file missing' });
  }

  if (taskType === 'precompile') {
    await validateScripts(issues);
  } else {
    addIssue(issues, { severity: 'error', file: 'harness', message: `不支持的 task_type：${taskType}` });
  }

  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const passed = errors.length === 0;
  const result: HarnessResult = {
    harness_result: {
      task_type: taskType,
      target,
      context_pack: context,
      generated_artifacts: [],
      validation: { passed, errors: errors.length, warnings: warnings.length },
      blockers: errors,
      next_action: passed ? 'run compile-scripts' : 'fix blockers before compile',
    },
  };

  await fs.ensureDir(RUN_DIR);
  const latestPath = path.join(RUN_DIR, 'latest.json');
  await fs.writeJson(latestPath, result, { spaces: 2 });
  result.harness_result.generated_artifacts.push(normalizeSlashes(path.relative(PROJECT_ROOT, latestPath)));
  await fs.writeJson(latestPath, result, { spaces: 2 });

  console.log(`Harness task: ${taskType}`);
  console.log(`Context loaded: ${context.loaded.length}, missing: ${context.missing.length}`);
  if (issues.length > 0) {
    console.log(issues.map(formatIssue).join('\n'));
  }
  console.log(`Harness result: ${passed ? 'PASS' : 'FAIL'} (${errors.length} error(s), ${warnings.length} warning(s))`);
  console.log(`Harness report: ${normalizeSlashes(path.relative(PROJECT_ROOT, latestPath))}`);

  if (!passed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

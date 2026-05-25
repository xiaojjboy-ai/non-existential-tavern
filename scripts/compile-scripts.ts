/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';
import type {
  ChoiceBranch,
  Command,
  DialogueNode,
  DrinkRule,
  PlotData,
  CommandType,
  AffinityEffect,
} from '../src/types/game';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT_DIR = path.join(PROJECT_ROOT, '脚本');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'plot-data.json');

const LAYER_NAMES = ['指令层', '对话层', '数据层'] as const;
const COMMAND_TYPES: CommandType[] = [
  'BG', 'BGM', 'SE', 'LIGHT', 'PROP', 'ENTER', 'EXIT',
  'EMO', 'PAUSE', 'GOTO', 'CHOICE', 'END',
];

type LayerName = (typeof LAYER_NAMES)[number];
type PlotMap = Record<string, PlotData>;
type YamlRecord = Record<string, unknown>;
type ChoiceRoutes = Record<string, Record<string, string>>;

interface CompileIssue {
  file: string;
  layer?: LayerName;
  message: string;
}

interface ParsedMarkdown {
  layers: Record<LayerName, string>;
}

interface ParsedCommands {
  commands: Command[];
  choiceRoutes: ChoiceRoutes;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addIssue(issues: CompileIssue[], file: string, message: string, layer?: LayerName) {
  issues.push({ file, layer, message });
}

function formatIssue(issue: CompileIssue) {
  const layer = issue.layer ? ` / ${issue.layer}` : '';
  return `- ${issue.file}${layer}: ${issue.message}`;
}

function parseLayers(file: string, content: string, issues: CompileIssue[]): ParsedMarkdown | null {
  const headerMatches = [...content.matchAll(/^##\s*(指令层|对话层|数据层)\s*$/gm)];
  const layerBodies: Partial<Record<LayerName, string>> = {};

  if (headerMatches.length === 0) {
    addIssue(issues, file, '缺少 `## 指令层`、`## 对话层`、`## 数据层` 三层标题。');
    return null;
  }

  for (const layerName of LAYER_NAMES) {
    const match = headerMatches.find((candidate) => candidate[1] === layerName);
    if (!match) {
      addIssue(issues, file, `缺少 \`## ${layerName}\`。`, layerName);
      continue;
    }
    const start = match.index + match[0].length;
    const next = headerMatches.find((candidate) => candidate.index > match.index);
    const rawBody = content.slice(start, next?.index ?? content.length);
    layerBodies[layerName] = rawBody.replace(/^---\s*$/gm, '').trim();
  }

  if (!LAYER_NAMES.every((name) => layerBodies[name] !== undefined)) {
    return null;
  }

  return { layers: layerBodies as Record<LayerName, string> };
}

function parseCommandParams(type: CommandType, paramsStr: string): any {
  const parts = paramsStr.split(/\s+/).filter(Boolean);
  switch (type) {
    case 'BG': return { assetId: parts[0] || '', transition: parts[1] || 'none' };
    case 'BGM': return { assetId: parts[0] || '', action: parts[1] || 'play', duration: parts[2] ? Number(parts[2]) : undefined };
    case 'SE': return { assetId: parts[0] || '', volume: parts[1] ? Number(parts[1]) : undefined, loop: parts[2] === 'true' };
    case 'LIGHT': return { color: parts[0] || '#ffffff', intensity: parts[1] ? Number(parts[1]) : 1, description: parts.slice(2).join(' ') };
    case 'PROP': return { propId: parts[0] || '', action: parts[1] || 'show', state: parts[2] };
    case 'ENTER': return { characterId: parts[0] || '', poseId: parts[1] || '', position: parts[2] || 'center' };
    case 'EXIT': return { characterId: parts[0] || '' };
    case 'EMO': return { characterId: parts[0] || '', emoId: parts[1] || '' };
    case 'PAUSE': return { durationMs: parts[0] ? Number(parts[0]) : 1000 };
    case 'GOTO': return { targetNodeId: parts[0] || '' };
    case 'CHOICE': return { choiceId: parts[0] || '' };
    case 'END': return {};
    default: return {};
  }
}

function parseCommands(file: string, section: string, issues: CompileIssue[]): ParsedCommands {
  const commands: Command[] = [];
  const choiceRoutes: ChoiceRoutes = {};
  let activeChoiceId: string | null = null;
  let cmdIdCounter = 1;

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '```') continue;

    const commandMatch = trimmed.match(/^\[([A-Z]+)(?:\s+([^\]]+))?\]$/);
    if (commandMatch) {
      const typeStr = commandMatch[1];
      if (!COMMAND_TYPES.includes(typeStr as CommandType)) {
        addIssue(issues, file, `不支持的指令 \`[${typeStr}]\`。`, '指令层');
        activeChoiceId = null;
        continue;
      }
      const type = typeStr as CommandType;
      const paramsStr = (commandMatch[2] ?? '').trim();
      const params = parseCommandParams(type, paramsStr);

      const command: Command = {
        id: `cmd_${String(cmdIdCounter++).padStart(4, '0')}`,
        type: type as any,
        params,
        raw: trimmed
      } as Command;

      commands.push(command);
      activeChoiceId = type === 'CHOICE' ? paramsStr : null;
      if (activeChoiceId) {
        choiceRoutes[activeChoiceId] = {};
      }
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      addIssue(issues, file, `无法解析的指令行：${trimmed}`, '指令层');
      activeChoiceId = null;
      continue;
    }

    if (!activeChoiceId) continue;
    const routeMatch = trimmed.match(/^(.+?)\s*(?:→|->)\s*([A-Za-z0-9_]+)(?:\s+.*)?$/);
    if (routeMatch) {
      choiceRoutes[activeChoiceId][routeMatch[1].trim()] = routeMatch[2].trim();
    }
  }

  return { commands, choiceRoutes };
}

function normalizeDialogueText(rawText: string) {
  return rawText.replace(/```/g, '').replace(/^#{1,6}\s+.*$/gm, '').trim();
}

function splitActorAndText(rawText: string) {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = lines[0] ?? '';
  const speakerMatch = first.match(/^([^：:]{1,40})[：:]\s*(.*)$/);

  if (!speakerMatch) {
    return { actor: '', text: lines.join('\n') };
  }

  const actor = speakerMatch[1].trim();
  const firstText = speakerMatch[2].trim();
  const rest = lines.slice(1).join('\n');
  return {
    actor,
    text: [firstText, rest].filter(Boolean).join('\n'),
  };
}

function parseDialogues(file: string, section: string, issues: CompileIssue[]) {
  const cleaned = section.replace(/```(?:\w+)?/g, '');
  const nodeMatches = [...cleaned.matchAll(/^\[(dlg_[A-Za-z0-9_]+|narr_[A-Za-z0-9_]+)\]\s*$/gm)];
  const dialogues: Record<string, DialogueNode> = {};
  const narratives: Record<string, DialogueNode> = {};
  const dialogueOrder: string[] = [];

  if (nodeMatches.length === 0) {
    addIssue(issues, file, '没有找到任何 `[dlg_*]` 或 `[narr_*]` 节点。', '对话层');
  }

  for (let index = 0; index < nodeMatches.length; index++) {
    const match = nodeMatches[index];
    const id = match[1];
    const start = match.index + match[0].length;
    const end = nodeMatches[index + 1]?.index ?? cleaned.length;
    const rawText = normalizeDialogueText(cleaned.slice(start, end));

    if (!rawText) {
      addIssue(issues, file, `节点 \`${id}\` 没有正文。`, '对话层');
    }

    if (id.startsWith('dlg_')) {
      const { actor, text } = splitActorAndText(rawText);
      dialogueOrder.push(id);
      dialogues[id] = { id, actor, text };
    } else {
      narratives[id] = { id, actor: '旁白', text: rawText };
    }
  }

  return { dialogues, narratives, dialogueOrder };
}

function parseYamlLayer(file: string, section: string, issues: CompileIssue[]): YamlRecord {
  const yamlMatch = section.match(/```yaml\s*([\s\S]*?)```/) ?? section.match(/```\s*([\s\S]*?)```/);
  if (!yamlMatch) {
    addIssue(issues, file, '数据层必须包含一个 fenced YAML 代码块。', '数据层');
    return {};
  }

  try {
    const loaded = yaml.load(yamlMatch[1]);
    if (!isRecord(loaded)) {
      addIssue(issues, file, 'YAML 顶层必须是对象。', '数据层');
      return {};
    }
    return loaded;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addIssue(issues, file, `YAML 解析失败：${message}`, '数据层');
    return {};
  }
}

function asBranches(value: unknown): Record<string, Record<string, ChoiceBranch>> {
  if (!isRecord(value)) return {};

  const branches: Record<string, Record<string, ChoiceBranch>> = {};
  for (const [branchId, branchValue] of Object.entries(value)) {
    if (!isRecord(branchValue)) continue;
    branches[branchId] = {};

    for (const [choiceKey, choiceValue] of Object.entries(branchValue)) {
      if (!isRecord(choiceValue)) continue;
      const gotoNodeId = typeof choiceValue.gotoNodeId === 'string' ? choiceValue.gotoNodeId : (typeof choiceValue.goto === 'string' ? choiceValue.goto : '');
      const effects = Array.isArray(choiceValue.effects) ? choiceValue.effects : [];
      const pace = choiceValue.pace;
      const ending = choiceValue.ending;
      branches[branchId][choiceKey] = {
        gotoNodeId,
        effects: effects as AffinityEffect[],
        pace: pace === 'normal' || pace === 'tight' || pace === 'slow' ? pace : undefined,
        ending: typeof ending === 'string' ? ending : undefined,
      };
    }
  }

  return branches;
}

function asDrinkRule(value: unknown): DrinkRule | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;

  return {
    id: value.id,
    correctRecipe: value.correctRecipe as any,
    hints: Array.isArray(value.hints) ? value.hints : [],
    evaluationRules: Array.isArray(value.evaluationRules) ? value.evaluationRules : []
  };
}

function getNodeIds(plotData: PlotData) {
  return new Set([...Object.keys(plotData.dialogues), ...Object.keys(plotData.narratives)]);
}

function validatePlot(file: string, plotData: PlotData, choiceRoutes: ChoiceRoutes, issues: CompileIssue[]) {
  const nodeIds = getNodeIds(plotData);

  for (const command of plotData.commands) {
    if (command.type === 'GOTO') {
      const target = (command.params as any).targetNodeId;
      if (!nodeIds.has(target)) {
        addIssue(issues, file, `[GOTO ${target}] 指向不存在的对话/旁白节点。`, '指令层');
      }
    }

    if (command.type === 'CHOICE') {
      const target = (command.params as any).choiceId;
      const isBranch = plotData.branches[target] !== undefined;
      const isDrink = plotData.drink?.id === target;
      if (!isBranch && !isDrink) {
        addIssue(issues, file, `[CHOICE ${target}] 未在 branches 或 drink.id 中定义。`, '指令层');
      }
    }
  }

  for (const [branchId, choices] of Object.entries(plotData.branches)) {
    for (const [choiceKey, branch] of Object.entries(choices)) {
      if (!branch.gotoNodeId || !nodeIds.has(branch.gotoNodeId)) {
        addIssue(issues, file, `branches.${branchId}.${choiceKey}.gotoNodeId 指向不存在的节点：${branch.gotoNodeId || '(空)'}`, '数据层');
      }
    }
  }

  if (plotData.drink) {
    for (const evalRule of plotData.drink.evaluationRules) {
      if (!nodeIds.has(evalRule.gotoNodeId)) {
        addIssue(issues, file, `drink.evaluationRules[${evalRule.id}].gotoNodeId 指向不存在的节点：${evalRule.gotoNodeId}`, '数据层');
      }
    }
  }
}

function buildPlotData(yamlData: YamlRecord, commands: Command[], dialoguesResult: ReturnType<typeof parseDialogues>): PlotData {
  const finalDialogues = { ...dialoguesResult.dialogues };
  const yamlDialogues = isRecord(yamlData.dialogues) ? yamlData.dialogues : {};
  
  for (const [id, node] of Object.entries(finalDialogues)) {
    if (isRecord(yamlDialogues[id])) {
      const extra = yamlDialogues[id] as any;
      if (extra.effects) {
        node.effects = extra.effects;
      }
    }
  }

  return {
    meta: isRecord(yamlData.meta) ? yamlData.meta as unknown as PlotData['meta'] : {
      day: '', character: '', visit: null, requires: null, unlocks: [], next: null, resources: {},
    },
    affinity: yamlData.affinity as PlotData['affinity'],
    drink: asDrinkRule(yamlData.drink),
    branches: asBranches(yamlData.branches),
    dialogues: finalDialogues,
    dialogueOrder: dialoguesResult.dialogueOrder,
    narratives: dialoguesResult.narratives,
    commands,
    links: yamlData.links,
    metaphor: yamlData.metaphor,
  };
}

async function compile() {
  console.log('Starting script compilation...');
  const files = await glob('*.md', { cwd: SCRIPT_DIR });
  const scriptFiles = files.filter((file) => !file.startsWith('模板_'));
  const skippedFiles = files.length - scriptFiles.length;
  const allPlots: PlotMap = {};
  const issues: CompileIssue[] = [];

  console.log(`Found ${files.length} markdown file(s). Compiling ${scriptFiles.length}, skipped ${skippedFiles} template file(s).`);

  for (const file of scriptFiles) {
    const filePath = path.join(SCRIPT_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const plotId = file.replace(/\.md$/i, '');

    const parsed = parseLayers(file, content, issues);
    if (!parsed) continue;

    const { commands, choiceRoutes } = parseCommands(file, parsed.layers['指令层'], issues);
    const dialoguesResult = parseDialogues(file, parsed.layers['对话层'], issues);
    const yamlData = parseYamlLayer(file, parsed.layers['数据层'], issues);
    const plotData = buildPlotData(yamlData, commands, dialoguesResult);

    validatePlot(file, plotData, choiceRoutes, issues);
    allPlots[plotId] = plotData;
  }

  if (issues.length > 0) {
    console.error('\nScript compilation failed:');
    console.error(issues.map(formatIssue).join('\n'));
    process.exitCode = 1;
    return;
  }

  await fs.ensureDir(OUTPUT_DIR);
  await fs.writeJson(OUTPUT_FILE, allPlots, { spaces: 2 });
  console.log(`Compilation finished. Saved to ${OUTPUT_FILE}`);
}

compile().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

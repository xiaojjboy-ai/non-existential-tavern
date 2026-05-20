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
} from '../src/types/game';

const SCRIPT_DIR = path.join(__dirname, '../../脚本');
const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'plot-data.json');

const LAYER_NAMES = ['指令层', '对话层', '数据层'] as const;
const COMMAND_TYPES = [
  'BG',
  'BGM',
  'SE',
  'LIGHT',
  'PROP',
  'ENTER',
  'EXIT',
  'EMO',
  'PAUSE',
  'GOTO',
  'CHOICE',
  'END',
] as const;

type LayerName = (typeof LAYER_NAMES)[number];
type CommandType = (typeof COMMAND_TYPES)[number];
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

  const ordered = headerMatches.map((match) => match[1]).filter((name): name is LayerName => {
    return LAYER_NAMES.includes(name as LayerName);
  });
  const firstSeen = LAYER_NAMES.map((name) => ordered.indexOf(name));
  if (firstSeen.some((index) => index === -1) || firstSeen.some((index, i) => i > 0 && index < firstSeen[i - 1])) {
    addIssue(issues, file, '三层顺序必须是：指令层 -> 对话层 -> 数据层。');
  }

  if (!LAYER_NAMES.every((name) => layerBodies[name] !== undefined)) {
    return null;
  }

  return { layers: layerBodies as Record<LayerName, string> };
}

function parseCommands(file: string, section: string, issues: CompileIssue[]): ParsedCommands {
  const commands: Command[] = [];
  const choiceRoutes: ChoiceRoutes = {};
  let activeChoiceId: string | null = null;
  let activeChoiceCommand: Command | null = null;

  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '```') continue;

    const commandMatch = trimmed.match(/^\[(\w+)(?:\s+([^\]]+))?\]$/);
    if (commandMatch) {
      const type = commandMatch[1] as CommandType;
      if (!COMMAND_TYPES.includes(type)) {
        addIssue(issues, file, `不支持的指令 \`[${commandMatch[1]}]\`。`, '指令层');
        activeChoiceId = null;
        continue;
      }

      const params = (commandMatch[2] ?? '').trim();
      if (type !== 'END' && params.length === 0) {
        addIssue(issues, file, `指令 \`[${type}]\` 缺少参数。`, '指令层');
      }

      const command: Command = type === 'CHOICE'
        ? { type, params, raw: trimmed, choices: {} }
        : { type, params, raw: trimmed };
      commands.push(command);
      activeChoiceId = type === 'CHOICE' ? params : null;
      activeChoiceCommand = type === 'CHOICE' ? command : null;
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
      if (activeChoiceCommand?.choices) {
        activeChoiceCommand.choices[routeMatch[1].trim()] = routeMatch[2].trim();
      }
    }
  }

  return { commands, choiceRoutes };
}

function normalizeDialogueText(rawText: string) {
  return rawText
    .replace(/```/g, '')
    .replace(/^#{1,6}\s+.*$/gm, '')
    .trim();
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
      const goto = typeof choiceValue.goto === 'string' ? choiceValue.goto : '';
      const effect = choiceValue.effect;
      const pace = choiceValue.pace;
      const ending = choiceValue.ending;
      branches[branchId][choiceKey] = {
        goto,
        effect: typeof effect === 'string' || Array.isArray(effect) ? effect as string | string[] : null,
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

  const wrongEffects: DrinkRule['wrong_effects'] = {};
  if (isRecord(value.wrong_effects)) {
    for (const [drinkName, effect] of Object.entries(value.wrong_effects)) {
      if (!isRecord(effect)) continue;
      wrongEffects[drinkName] = {
        dialogue: typeof effect.dialogue === 'string' ? effect.dialogue : '',
        reaction: typeof effect.reaction === 'string' ? effect.reaction : '',
      };
    }
  }

  return {
    id: value.id,
    available: Array.isArray(value.available) ? value.available.filter((item): item is string => typeof item === 'string') : [],
    correct: typeof value.correct === 'string' ? value.correct : '',
    hint: typeof value.hint === 'string' ? value.hint : '',
    correct_effect: isRecord(value.correct_effect) ? {
      affinity: typeof value.correct_effect.affinity === 'string' ? value.correct_effect.affinity : undefined,
      emotion: typeof value.correct_effect.emotion === 'string' ? value.correct_effect.emotion : undefined,
    } : {},
    wrong_effects: wrongEffects,
  };
}

function getNodeIds(plotData: PlotData) {
  return new Set([...Object.keys(plotData.dialogues), ...Object.keys(plotData.narratives)]);
}

function validatePlot(file: string, plotData: PlotData, choiceRoutes: ChoiceRoutes, issues: CompileIssue[]) {
  const nodeIds = getNodeIds(plotData);

  for (const command of plotData.commands) {
    if (command.type === 'GOTO' && !nodeIds.has(command.params)) {
      addIssue(issues, file, `[GOTO ${command.params}] 指向不存在的对话/旁白节点。`, '指令层');
    }

    if (command.type === 'CHOICE') {
      const isBranch = plotData.branches[command.params] !== undefined;
      const isDrink = plotData.drink?.id === command.params;
      if (!isBranch && !isDrink) {
        addIssue(issues, file, `[CHOICE ${command.params}] 未在 branches 或 drink.id 中定义。`, '指令层');
      }
    }
  }

  for (const [branchId, choices] of Object.entries(plotData.branches)) {
    for (const [choiceKey, branch] of Object.entries(choices)) {
      if (!branch.goto || !nodeIds.has(branch.goto)) {
        addIssue(issues, file, `branches.${branchId}.${choiceKey}.goto 指向不存在的节点：${branch.goto || '(空)'}`, '数据层');
      }

      const scriptedGoto = choiceRoutes[branchId]?.[choiceKey];
      if (scriptedGoto && scriptedGoto !== branch.goto) {
        addIssue(issues, file, `指令层 ${branchId}.${choiceKey} 跳到 ${scriptedGoto}，但数据层写的是 ${branch.goto}。`, '数据层');
      }
    }
  }

  if (plotData.drink) {
    if (!plotData.drink.available.includes(plotData.drink.correct)) {
      addIssue(issues, file, `drink.correct \`${plotData.drink.correct}\` 不在 drink.available 中。`, '数据层');
    }

    for (const [drinkName, effect] of Object.entries(plotData.drink.wrong_effects)) {
      if (!nodeIds.has(effect.dialogue)) {
        addIssue(issues, file, `drink.wrong_effects.${drinkName}.dialogue 指向不存在的节点：${effect.dialogue}`, '数据层');
      }

      const scriptedGoto = choiceRoutes[plotData.drink.id]?.[drinkName];
      if (scriptedGoto && scriptedGoto !== effect.dialogue) {
        addIssue(issues, file, `指令层 ${plotData.drink.id}.${drinkName} 跳到 ${scriptedGoto}，但数据层写的是 ${effect.dialogue}。`, '数据层');
      }
    }

    const correctRoute = choiceRoutes[plotData.drink.id]?.[plotData.drink.correct];
    if (correctRoute && !nodeIds.has(correctRoute)) {
      addIssue(issues, file, `调酒正确选项 ${plotData.drink.correct} 指向不存在的节点：${correctRoute}`, '指令层');
    }
  }

  const metaphor = plotData.metaphor;
  if (Array.isArray(metaphor)) {
    for (const item of metaphor) {
      if (isRecord(item) && typeof item.anchor === 'string' && !nodeIds.has(item.anchor)) {
        addIssue(issues, file, `metaphor anchor 指向不存在的节点：${item.anchor}`, '数据层');
      }
    }
  }
}

function buildPlotData(yamlData: YamlRecord, commands: Command[], dialoguesResult: ReturnType<typeof parseDialogues>): PlotData {
  return {
    meta: isRecord(yamlData.meta) ? yamlData.meta as unknown as PlotData['meta'] : {
      day: '',
      character: '',
      visit: null,
      requires: null,
      unlocks: [],
      next: null,
      resources: {},
    },
    affinity: yamlData.affinity as PlotData['affinity'],
    drink: asDrinkRule(yamlData.drink),
    branches: asBranches(yamlData.branches),
    dialogues: dialoguesResult.dialogues,
    dialogueOrder: dialoguesResult.dialogueOrder,
    narratives: dialoguesResult.narratives,
    commands,
    links: yamlData.links,
    metaphor: yamlData.metaphor,
  };
}

async function compile() {
  console.log('Starting script compilation...');
  console.log(`Script directory: ${SCRIPT_DIR}`);

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

    console.log(`Processing ${file}...`);

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

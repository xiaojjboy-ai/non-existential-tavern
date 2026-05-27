import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';
/* eslint-disable @typescript-eslint/no-explicit-any */
type ChoiceBranch = any;
type Command = any;
type DialogueNode = any;
type DrinkRule = any;
type PlotData = any;
type Resource = any;
type AffinityRule = any;
type AffinityChange = any;
import { transformToV2 } from './transformToV2';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCRIPT_DIR = path.join(PROJECT_ROOT, '脚本');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'src/data');
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

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(len=${value.length})`;
  return typeof value;
}

function previewValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value.length > 40 ? `"${value.slice(0, 40)}…"` : `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} item(s)]`;
  if (isRecord(value)) return `{${Object.keys(value).join(', ')}}`;
  return typeof value;
}

function addConversionIssue(
  issues: CompileIssue[],
  file: string,
  fieldPath: string,
  expected: string,
  actual: unknown,
) {
  addIssue(
    issues,
    file,
    `字段 \`${fieldPath}\` 类型转换失败：期望 ${expected}，实际 ${describeType(actual)}（${previewValue(actual)}）。`,
    '数据层',
  );
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
function asMeta(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): PlotData['meta'] {
  const defaultMeta: PlotData['meta'] = {
    day: '',
    character: '',
    visit: null,
    requires: null,
    unlocks: [],
    next: null,
    resources: {},
  };

  if (value === undefined || value === null) {
    addIssue(issues, file, '数据层缺少 `meta`。', '数据层');
    return defaultMeta;
  }

  if (!isRecord(value)) {
    addConversionIssue(issues, file, 'meta', 'object', value);
    return defaultMeta;
  }

  const meta: Partial<PlotData['meta']> = {};

  // 1. day: string | number
  if (typeof value.day !== 'string' && typeof value.day !== 'number') {
    addConversionIssue(issues, file, 'meta.day', 'string | number', value.day);
    meta.day = '';
  } else {
    meta.day = value.day;
  }

  // 2. character: string | string[]
  if (typeof value.character === 'string') {
    meta.character = value.character;
  } else if (Array.isArray(value.character)) {
    const stringItems = value.character.filter((item): item is string => typeof item === 'string');
    if (stringItems.length !== value.character.length) {
      addConversionIssue(issues, file, 'meta.character', 'string[]（仅字符串）', value.character);
    }
    meta.character = stringItems;
  } else {
    addConversionIssue(issues, file, 'meta.character', 'string | string[]', value.character);
    meta.character = '';
  }

  // 3. visit: number | string | null
  if (value.visit === undefined || value.visit === null) {
    meta.visit = null;
  } else if (typeof value.visit === 'number' || typeof value.visit === 'string') {
    meta.visit = value.visit;
  } else {
    addConversionIssue(issues, file, 'meta.visit', 'number | string | null', value.visit);
    meta.visit = null;
  }

  // 4. requires: unknown
  meta.requires = value.requires;

  // 5. unlocks: Array<Record<string, unknown>>
  if (value.unlocks === undefined || value.unlocks === null) {
    meta.unlocks = [];
  } else if (Array.isArray(value.unlocks)) {
    const records: Array<Record<string, unknown>> = [];
    for (let i = 0; i < value.unlocks.length; i++) {
      const item = value.unlocks[i];
      if (isRecord(item)) {
        records.push(item);
      } else {
        addConversionIssue(issues, file, `meta.unlocks[${i}]`, 'object', item);
      }
    }
    meta.unlocks = records;
  } else {
    addConversionIssue(issues, file, 'meta.unlocks', 'array', value.unlocks);
    meta.unlocks = [];
  }

  // 6. next: string | null
  if (value.next === undefined || value.next === null) {
    meta.next = null;
  } else if (typeof value.next === 'string') {
    meta.next = value.next;
  } else {
    addConversionIssue(issues, file, 'meta.next', 'string | null', value.next);
    meta.next = null;
  }

  // 7. resources: { bg?, bgm?, se?, sprite? }
  const resources: PlotData['meta']['resources'] = {};
  if (value.resources !== undefined && value.resources !== null) {
    if (!isRecord(value.resources)) {
      addConversionIssue(issues, file, 'meta.resources', 'object', value.resources);
    } else {
      const resTypes = ['bg', 'bgm', 'se', 'sprite'] as const;
      for (const resType of resTypes) {
        const list = value.resources[resType];
        if (list === undefined) continue;
        if (!Array.isArray(list)) {
          addConversionIssue(issues, file, `meta.resources.${resType}`, 'array', list);
          continue;
        }
        const resourcesList: Resource[] = [];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!isRecord(item)) {
            addConversionIssue(issues, file, `meta.resources.${resType}[${i}]`, 'object', item);
            continue;
          }
          if (typeof item.id !== 'string') {
            addConversionIssue(issues, file, `meta.resources.${resType}[${i}].id`, 'string', item.id);
          }
          if (typeof item.desc !== 'string') {
            addConversionIssue(issues, file, `meta.resources.${resType}[${i}].desc`, 'string', item.desc);
          }
          resourcesList.push({
            id: typeof item.id === 'string' ? item.id : '',
            desc: typeof item.desc === 'string' ? item.desc : '',
          });
        }
        resources[resType] = resourcesList;
      }
    }
  }
  meta.resources = resources;

  // 8. is_ending?: boolean
  if (value.is_ending !== undefined) {
    if (typeof value.is_ending === 'boolean') {
      meta.is_ending = value.is_ending;
    } else {
      addConversionIssue(issues, file, 'meta.is_ending', 'boolean', value.is_ending);
    }
  }

  // 9. is_reveal?: boolean
  if (value.is_reveal !== undefined) {
    if (typeof value.is_reveal === 'boolean') {
      meta.is_reveal = value.is_reveal;
    } else {
      addConversionIssue(issues, file, 'meta.is_reveal', 'boolean', value.is_reveal);
    }
  }

  // 10. ending_variants?: Record<string, string>
  if (value.ending_variants !== undefined) {
    if (!isRecord(value.ending_variants)) {
      addConversionIssue(issues, file, 'meta.ending_variants', 'object', value.ending_variants);
    } else {
      const variants: Record<string, string> = {};
      for (const [k, v] of Object.entries(value.ending_variants)) {
        if (typeof v !== 'string') {
          addConversionIssue(issues, file, `meta.ending_variants.${k}`, 'string', v);
        }
        variants[k] = typeof v === 'string' ? v : '';
      }
      meta.ending_variants = variants;
    }
  }

  return meta as PlotData['meta'];
}

function asAffinityRule(
  value: Record<string, unknown>,
  file: string,
  issues: CompileIssue[],
  pathPrefix: string,
): AffinityRule {
  const rule: Partial<AffinityRule> = {};

  if (typeof value.character !== 'string') {
    addConversionIssue(issues, file, `${pathPrefix}.character`, 'string', value.character);
    rule.character = '';
  } else {
    rule.character = value.character;
  }

  if (typeof value.start !== 'number') {
    addConversionIssue(issues, file, `${pathPrefix}.start`, 'number', value.start);
    rule.start = 0;
  } else {
    rule.start = value.start;
  }

  if (typeof value.max !== 'number') {
    addConversionIssue(issues, file, `${pathPrefix}.max`, 'number', value.max);
    rule.max = 0;
  } else {
    rule.max = value.max;
  }

  const changes: AffinityChange[] = [];
  if (value.changes !== undefined && value.changes !== null) {
    if (!Array.isArray(value.changes)) {
      addConversionIssue(issues, file, `${pathPrefix}.changes`, 'array', value.changes);
    } else {
      for (let i = 0; i < value.changes.length; i++) {
        const item = value.changes[i];
        const changePath = `${pathPrefix}.changes[${i}]`;
        if (!isRecord(item)) {
          addConversionIssue(issues, file, changePath, 'object', item);
          continue;
        }

        if (typeof item.id !== 'string') {
          addConversionIssue(issues, file, `${changePath}.id`, 'string', item.id);
        }
        if (typeof item.trigger !== 'string') {
          addConversionIssue(issues, file, `${changePath}.trigger`, 'string', item.trigger);
        }
        if (typeof item.field !== 'string') {
          addConversionIssue(issues, file, `${changePath}.field`, 'string', item.field);
        }
        if (typeof item.value !== 'number') {
          addConversionIssue(issues, file, `${changePath}.value`, 'number', item.value);
        }
        let note: string | null = null;
        if (item.note !== undefined && item.note !== null) {
          if (typeof item.note === 'string') {
            note = item.note;
          } else {
            addConversionIssue(issues, file, `${changePath}.note`, 'string | null', item.note);
          }
        }

        changes.push({
          id: typeof item.id === 'string' ? item.id : '',
          trigger: typeof item.trigger === 'string' ? item.trigger : '',
          field: typeof item.field === 'string' ? item.field : '',
          value: typeof item.value === 'number' ? item.value : 0,
          note,
        });
      }
    }
  }
  rule.changes = changes;

  return rule as AffinityRule;
}

function asAffinity(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): PlotData['affinity'] {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const rules: AffinityRule[] = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (!isRecord(item)) {
        addConversionIssue(issues, file, `affinity[${i}]`, 'object', item);
        continue;
      }
      rules.push(asAffinityRule(item, file, issues, `affinity[${i}]`));
    }
    return rules;
  }

  if (isRecord(value)) {
    return asAffinityRule(value, file, issues, 'affinity');
  }

  addConversionIssue(issues, file, 'affinity', 'object | array', value);
  return undefined;
}

function asLinks(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!isRecord(value)) {
    addConversionIssue(issues, file, 'links', 'object', value);
    return undefined;
  }

  const links: Record<string, unknown> = {};

  if (value.next_visit !== undefined && value.next_visit !== null) {
    if (typeof value.next_visit !== 'string') {
      addConversionIssue(issues, file, 'links.next_visit', 'string', value.next_visit);
    } else {
      links.next_visit = value.next_visit;
    }
  }

  if (value.related !== undefined && value.related !== null) {
    if (!Array.isArray(value.related)) {
      addConversionIssue(issues, file, 'links.related', 'array', value.related);
    } else {
      const relatedList: unknown[] = [];
      for (let i = 0; i < value.related.length; i++) {
        const item = value.related[i];
        const itemPath = `links.related[${i}]`;
        if (!isRecord(item)) {
          addConversionIssue(issues, file, itemPath, 'object', item);
          continue;
        }
        const rel: Record<string, unknown> = {};
        if (item.day !== undefined && typeof item.day !== 'number' && typeof item.day !== 'string') {
          addConversionIssue(issues, file, `${itemPath}.day`, 'number | string', item.day);
        }
        if (item.character !== undefined) {
          if (typeof item.character !== 'string' && !Array.isArray(item.character)) {
            addConversionIssue(issues, file, `${itemPath}.character`, 'string | string[]', item.character);
          } else if (Array.isArray(item.character)) {
            const stringItems = item.character.filter((x): x is string => typeof x === 'string');
            if (stringItems.length !== item.character.length) {
              addConversionIssue(issues, file, `${itemPath}.character`, 'string[]（仅字符串）', item.character);
            }
          }
        }
        if (item.visit !== undefined && typeof item.visit !== 'number' && typeof item.visit !== 'string') {
          addConversionIssue(issues, file, `${itemPath}.visit`, 'number | string', item.visit);
        }
        if (item.event !== undefined && typeof item.event !== 'string') {
          addConversionIssue(issues, file, `${itemPath}.event`, 'string', item.event);
        }

        if (item.conditions !== undefined && item.conditions !== null) {
          if (!Array.isArray(item.conditions)) {
            addConversionIssue(issues, file, `${itemPath}.conditions`, 'array', item.conditions);
          } else {
            const conditionsList: unknown[] = [];
            for (let j = 0; j < item.conditions.length; j++) {
              const cond = item.conditions[j];
              const condPath = `${itemPath}.conditions[${j}]`;
              if (!isRecord(cond)) {
                addConversionIssue(issues, file, condPath, 'object', cond);
                continue;
              }
              if (typeof cond.if !== 'string') {
                addConversionIssue(issues, file, `${condPath}.if`, 'string', cond.if);
              }
              if (typeof cond.then !== 'string') {
                addConversionIssue(issues, file, `${condPath}.then`, 'string', cond.then);
              }
              conditionsList.push({
                if: typeof cond.if === 'string' ? cond.if : '',
                then: typeof cond.then === 'string' ? cond.then : '',
              });
            }
            rel.conditions = conditionsList;
          }
        }

        rel.day = item.day;
        rel.character = item.character;
        rel.visit = item.visit;
        rel.event = item.event;
        relatedList.push(rel);
      }
      links.related = relatedList;
    }
  }

  return links;
}

function asMetaphor(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    addConversionIssue(issues, file, 'metaphor', 'array', value);
    return undefined;
  }

  const list: unknown[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    const itemPath = `metaphor[${i}]`;
    if (!isRecord(item)) {
      addConversionIssue(issues, file, itemPath, 'object', item);
      continue;
    }

    if (typeof item.anchor !== 'string') {
      addConversionIssue(issues, file, `${itemPath}.anchor`, 'string', item.anchor);
    }
    if (item.surface !== undefined && typeof item.surface !== 'string') {
      addConversionIssue(issues, file, `${itemPath}.surface`, 'string', item.surface);
    }
    if (item.deep !== undefined && typeof item.deep !== 'string') {
      addConversionIssue(issues, file, `${itemPath}.deep`, 'string', item.deep);
    }

    list.push({
      anchor: typeof item.anchor === 'string' ? item.anchor : '',
      surface: typeof item.surface === 'string' ? item.surface : undefined,
      deep: typeof item.deep === 'string' ? item.deep : undefined,
    });
  }

  return list;
}

function asBranches(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): Record<string, Record<string, ChoiceBranch>> {
  if (value === undefined) return {};
  if (!isRecord(value)) {
    addConversionIssue(issues, file, 'branches', 'object', value);
    return {};
  }

  const branches: Record<string, Record<string, ChoiceBranch>> = {};
  for (const [branchId, branchValue] of Object.entries(value)) {
    if (!isRecord(branchValue)) {
      addConversionIssue(issues, file, `branches.${branchId}`, 'object（选项表）', branchValue);
      continue;
    }
    branches[branchId] = {};

    for (const [choiceKey, choiceValue] of Object.entries(branchValue)) {
      const fieldRoot = `branches.${branchId}.${choiceKey}`;
      if (!isRecord(choiceValue)) {
        addConversionIssue(issues, file, fieldRoot, 'object（含 goto/effect 等字段）', choiceValue);
        continue;
      }

      const rawGoto = choiceValue.goto;
      if (typeof rawGoto !== 'string') {
        addConversionIssue(issues, file, `${fieldRoot}.goto`, 'string', rawGoto);
      }
      const goto = typeof rawGoto === 'string' ? rawGoto : '';

      const effect = choiceValue.effect;
      let normalizedEffect: string | string[] | null = null;
      if (effect === null || effect === undefined) {
        normalizedEffect = null;
      } else if (typeof effect === 'string') {
        normalizedEffect = effect;
      } else if (Array.isArray(effect)) {
        const stringItems = effect.filter((item): item is string => typeof item === 'string');
        if (stringItems.length !== effect.length) {
          addConversionIssue(issues, file, `${fieldRoot}.effect`, 'string[]（仅字符串）', effect);
        }
        normalizedEffect = stringItems;
      } else {
        addConversionIssue(issues, file, `${fieldRoot}.effect`, 'string | string[] | null', effect);
      }

      const pace = choiceValue.pace;
      let normalizedPace: 'normal' | 'tight' | 'slow' | undefined;
      if (pace === undefined) {
        normalizedPace = undefined;
      } else if (pace === 'normal' || pace === 'tight' || pace === 'slow') {
        normalizedPace = pace;
      } else {
        addConversionIssue(issues, file, `${fieldRoot}.pace`, '"normal" | "tight" | "slow"', pace);
      }

      const ending = choiceValue.ending;
      let normalizedEnding: string | undefined;
      if (ending === undefined) {
        normalizedEnding = undefined;
      } else if (typeof ending === 'string') {
        normalizedEnding = ending;
      } else {
        addConversionIssue(issues, file, `${fieldRoot}.ending`, 'string', ending);
      }

      branches[branchId][choiceKey] = {
        goto,
        effect: normalizedEffect,
        pace: normalizedPace,
        ending: normalizedEnding,
      };
    }
  }

  return branches;
}

function asDrinkRule(
  value: unknown,
  file: string,
  issues: CompileIssue[],
): DrinkRule | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    addConversionIssue(issues, file, 'drink', 'object | null', value);
    return null;
  }

  if (typeof value.id !== 'string') {
    addConversionIssue(issues, file, 'drink.id', 'string', value.id);
    return null;
  }

  const wrongEffects: DrinkRule['wrong_effects'] = {};
  if (value.wrong_effects !== undefined) {
    if (!isRecord(value.wrong_effects)) {
      addConversionIssue(issues, file, 'drink.wrong_effects', 'object', value.wrong_effects);
    } else {
      for (const [drinkName, effect] of Object.entries(value.wrong_effects)) {
        const root = `drink.wrong_effects.${drinkName}`;
        if (!isRecord(effect)) {
          addConversionIssue(issues, file, root, 'object（含 dialogue/reaction）', effect);
          continue;
        }
        if (typeof effect.dialogue !== 'string') {
          addConversionIssue(issues, file, `${root}.dialogue`, 'string', effect.dialogue);
        }
        if (typeof effect.reaction !== 'string') {
          addConversionIssue(issues, file, `${root}.reaction`, 'string', effect.reaction);
        }
        wrongEffects[drinkName] = {
          dialogue: typeof effect.dialogue === 'string' ? effect.dialogue : '',
          reaction: typeof effect.reaction === 'string' ? effect.reaction : '',
        };
      }
    }
  }

  let available: string[] = [];
  if (Array.isArray(value.available)) {
    const stringItems = value.available.filter((item): item is string => typeof item === 'string');
    if (stringItems.length !== value.available.length) {
      addConversionIssue(issues, file, 'drink.available', 'string[]（仅字符串）', value.available);
    }
    available = stringItems;
  } else if (value.available !== undefined) {
    addConversionIssue(issues, file, 'drink.available', 'string[]', value.available);
  }

  if (typeof value.correct !== 'string') {
    addConversionIssue(issues, file, 'drink.correct', 'string', value.correct);
  }
  if (value.hint !== undefined && typeof value.hint !== 'string') {
    addConversionIssue(issues, file, 'drink.hint', 'string', value.hint);
  }

  let correctEffect: DrinkRule['correct_effect'] = {};
  if (value.correct_effect !== undefined) {
    if (!isRecord(value.correct_effect)) {
      addConversionIssue(issues, file, 'drink.correct_effect', 'object', value.correct_effect);
    } else {
      const ce = value.correct_effect;
      if (ce.dialogue !== undefined && typeof ce.dialogue !== 'string') {
        addConversionIssue(issues, file, 'drink.correct_effect.dialogue', 'string', ce.dialogue);
      }
      if (ce.affinity !== undefined && typeof ce.affinity !== 'string') {
        addConversionIssue(issues, file, 'drink.correct_effect.affinity', 'string', ce.affinity);
      }
      if (ce.emotion !== undefined && typeof ce.emotion !== 'string') {
        addConversionIssue(issues, file, 'drink.correct_effect.emotion', 'string', ce.emotion);
      }
      correctEffect = {
        dialogue: typeof ce.dialogue === 'string' ? ce.dialogue : undefined,
        affinity: typeof ce.affinity === 'string' ? ce.affinity : undefined,
        emotion: typeof ce.emotion === 'string' ? ce.emotion : undefined,
      };
    }
  }

  return {
    id: value.id,
    available,
    correct: typeof value.correct === 'string' ? value.correct : '',
    hint: typeof value.hint === 'string' ? value.hint : '',
    correct_effect: correctEffect,
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

  for (const [branchId, choices] of Object.entries(plotData.branches || {})) {
    for (const [choiceKey, branch] of Object.entries(choices as any)) {
      if (!(branch as any).goto || !nodeIds.has((branch as any).goto)) {
        addIssue(issues, file, `branches.${branchId}.${choiceKey}.goto 指向不存在的节点：${(branch as any).goto || '(空)'}`, '数据层');
      }

      const scriptedGoto = choiceRoutes[branchId]?.[choiceKey];
      if (scriptedGoto && scriptedGoto !== (branch as any).goto) {
        addIssue(issues, file, `指令层 ${branchId}.${choiceKey} 跳到 ${scriptedGoto}，但数据层写的是 ${(branch as any).goto}。`, '数据层');
      }
    }
  }

  if (plotData.drink) {
    if (!plotData.drink.available.includes(plotData.drink.correct)) {
      addIssue(issues, file, `drink.correct \`${plotData.drink.correct}\` 不在 drink.available 中。`, '数据层');
    }

    for (const [drinkName, effect] of Object.entries(plotData.drink.wrong_effects || {})) {
      if (!nodeIds.has((effect as any).dialogue)) {
        addIssue(issues, file, `drink.wrong_effects.${drinkName}.dialogue 指向不存在的节点：${(effect as any).dialogue}`, '数据层');
      }

      const scriptedGoto = choiceRoutes[plotData.drink.id]?.[drinkName];
      if (scriptedGoto && scriptedGoto !== (effect as any).dialogue) {
        addIssue(issues, file, `指令层 ${plotData.drink.id}.${drinkName} 跳到 ${scriptedGoto}，但数据层写的是 ${(effect as any).dialogue}。`, '数据层');
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

function buildPlotData(
  yamlData: YamlRecord,
  commands: Command[],
  dialoguesResult: ReturnType<typeof parseDialogues>,
  file: string,
  issues: CompileIssue[],
): PlotData {
  return {
    meta: asMeta(yamlData.meta, file, issues),
    affinity: asAffinity(yamlData.affinity, file, issues),
    drink: asDrinkRule(yamlData.drink, file, issues),
    branches: asBranches(yamlData.branches, file, issues),
    dialogues: dialoguesResult.dialogues,
    dialogueOrder: dialoguesResult.dialogueOrder,
    narratives: dialoguesResult.narratives,
    commands,
    links: asLinks(yamlData.links, file, issues),
    metaphor: asMetaphor(yamlData.metaphor, file, issues),
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
    const plotData = buildPlotData(yamlData, commands, dialoguesResult, file, issues);

    validatePlot(file, plotData, choiceRoutes, issues);
    allPlots[plotId] = plotData;
  }

  await writeIssueLog(issues);

  if (issues.length > 0) {
    console.error('\nScript compilation failed:');
    console.error(issues.map(formatIssue).join('\n'));
    process.exitCode = 1;
    return;
  }

  await fs.ensureDir(OUTPUT_DIR);
  transformToV2(allPlots);
  await fs.writeJson(OUTPUT_FILE, allPlots, { spaces: 2 });
  console.log(`Compilation finished. Saved to ${OUTPUT_FILE}`);
}

async function writeIssueLog(issues: CompileIssue[]) {
  const logPath = path.join(__dirname, '..', 'harness', 'evidence', 'compile-issues.log');
  await fs.ensureDir(path.dirname(logPath));

  const header = [
    `# compile-issues.log`,
    `# generated: ${new Date().toISOString()}`,
    `# total: ${issues.length}`,
    '',
  ].join('\n');

  const body = issues.length === 0
    ? '(no issues — all conversions OK)\n'
    : issues.map(formatIssue).join('\n') + '\n';

  await fs.writeFile(logPath, header + body, 'utf8');
  console.log(`Wrote issue log: ${logPath} (${issues.length} issue(s))`);
}

compile().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

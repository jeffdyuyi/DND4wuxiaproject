import { field, plainText, originalBody } from './template-text';
import { adaptEquipment } from './equipment-template';
import type { ModuleType } from '../constants';
import type { Item, MoveItem, ProgressionItem, SchoolItem, RootItem, OriginItem, DestinyItem, EquipmentItem, GeneralItem } from '../types';
import { createResource } from './resources';

export const TemplateCategories = { power: '威能', class: '职业', race: '种族', feat: '专长', equipment: '装备', 'paragon-path': '典范之道', 'epic-destiny': '传奇命运' } as const;
export type TemplateCategory = keyof typeof TemplateCategories;
export const TemplateModules: Record<TemplateCategory, ModuleType[]> = {
    power: ['moves'], class: ['schools'], race: ['roots', 'origins', 'destinies'], feat: ['feats'], equipment: ['items'], 'paragon-path': ['traditions'], 'epic-destiny': ['paths'],
};
export interface OriginalEntry {
    id: string; name: string; nameEn?: string; category: TemplateCategory; schemaVersion?: number;
    fields?: Record<string, string>; source?: string; sourceText?: string; details?: string;
    wiki?: { transclusions?: string[]; links?: string[] }; provenance?: { contentHash?: string };
    [key: string]: unknown;
}
export interface TemplateSummary { id: string; name: string; nameEn: string; category: TemplateCategory; source: string; level: string; keywords: string; file: string; searchText?: string; }
export interface TemplateIndex { version: 1; dataset: string; sourceVersion: string; entries: TemplateSummary[]; }
export interface TemplateDraft { module: ModuleType; item: Item; warnings: string[]; }
export { field, plainText, originalBody } from './template-text';
function rows(entry: OriginalEntry): { title: string; text: string }[] {
    const details = field(entry, 'details');
    return [...details.matchAll(/<tr\b[^>]*>\s*<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi)].map(match => ({
        title: plainText(match[1]).replace(/[：:]$/, ''), text: plainText(match[2], entry.fields),
    }));
}
function boldLines(entry: OriginalEntry): Record<string, string> {
    return Object.fromEntries([...field(entry, 'sourceText').matchAll(/''([^'\n]+)[：:]''([^\n]*)/g)].map(match => [match[1], plainText(match[2], entry.fields)]));
}
export function classFamily(name: string) { return name.split(/[（(]/)[0].trim(); }

function schoolFeatures(entry: OriginalEntry, powers: ReadonlyMap<string, OriginalEntry>) {
    const source = field(entry, 'sourceText');
    const headings = [...source.matchAll(/^(!{1,3})[ \t]+([^\n]+)$/gm)];
    let inFeatures = false;
    const features: SchoolItem['features'] = [], spans: [number, number][] = [];
    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        if (heading[1] === '!') { inFeatures = /职业特性/.test(heading[2]); continue; }
        if (heading[1] !== '!!' || (!inFeatures && !/^\d+级[：:]/.test(heading[2]))) continue;
        const end = headings.slice(i + 1).find(next => next[1].length <= 2)?.index ?? source.length;
        const raw = source.slice(heading.index + heading[0].length, end);
        const resolved = raw.replace(/\{\{([^{}]+)\}\}/g, (match, ref: string) => {
            const power = powers.get(ref);
            if (!power) return match;
            const meta = [['等级', 'level'], ['频率', 'usageZh'], ['动作', 'actionType'], ['范围', 'range'], ['关键词', 'keywords']].map(([label, key]) => field(power, key, key === 'usageZh' ? 'usage' : key) ? label + '：' + plainText(field(power, key, key === 'usageZh' ? 'usage' : key)) : '').filter(Boolean);
            return [power.name, ...meta, originalBody(power)].join('\n');
        });
        const desc = plainText(resolved, entry.fields);
        if (!desc) continue;
        features.push({ id: crypto.randomUUID(), name: plainText(heading[2]), desc });
        spans.push([heading.index, end]);
    }
    let remaining = source;
    for (const [start, end] of spans.reverse()) remaining = remaining.slice(0, start) + remaining.slice(end);
    return { features, description: plainText(remaining, { ...entry.fields, title: entry.name }) };
}
function base(entry: OriginalEntry, module: ModuleType, sourceVersion: string): Item {
    return { ...createResource(module), name: entry.name, flavor: field(entry, 'flavorText'), source: field(entry, 'source'), sourceText: originalBody(entry),
        templateReference: { entryId: entry.id, category: entry.category, sourceVersion, schemaVersion: entry.schemaVersion ?? 1, contentHash: entry.provenance?.contentHash ?? '', originalJSON: JSON.stringify(entry) } };
}
export function adaptPower(entry: OriginalEntry, sourceVersion: string): TemplateDraft {
    const item = base(entry, 'moves', sourceVersion) as MoveItem;
    const warnings: string[] = [];
    const usage = field(entry, 'usage', 'usageZh');
    const frequency: Record<string, MoveItem['type']> = { 'at-will': 'basic', 随意: 'basic', encounter: 'special', 遭遇: 'special', daily: 'ultimate', 每日: 'ultimate' };
    item.type = frequency[usage] ?? 'basic';
    if (!frequency[usage]) { item.typeLabel = usage || '频率待核对'; warnings.push('使用频率未能识别，请核对原文。'); }
    const action = plainText(field(entry, 'actionType'));
    const actions: Record<string, string> = { 标准: 'std', 标准动作: 'std', 移动动作: 'mov', 次要动作: 'min', 自由动作: 'free', 即时中断: 'interrupt', 即时打断: 'interrupt', 即时反应: 'reaction', 借机动作: 'opportunity', 无动作: 'none' };
    item.action = actions[action] ?? action; item.actionLabel = action;
    if (!actions[action]) warnings.push('动作含复合说明或非标准用词，保留原文，请核对。');
    item.level = /^\d+$/.test(field(entry, 'level')) ? Number(field(entry, 'level')) : 0;
    if (!/^\d+$/.test(field(entry, 'level'))) warnings.push('原版未给出单一数字等级，草稿暂记 0 级。');
    item.cls = field(entry, 'grantedBy', 'powerType', 'power-type');
    item.keywords = plainText(field(entry, 'keywords')); item.range = plainText(field(entry, 'range')); item.att = ''; item.def = ''; item.rules = [];
    const known: Record<string, keyof MoveItem> = { 触发: 'trigger', 目标: 'target', 攻击: 'att', 命中: 'hit', 失手: 'miss', 效果: 'effect', 特殊: 'special' };
    const blocks = rows(entry), used = new Set<string>();
    for (const block of blocks) {
        const key = known[block.title];
        if (key && !used.has(block.title)) { Object.assign(item, { [key]: block.text }); used.add(block.title); }
        else if (block.title.startsWith('维持') && !item.sustain) item.sustain = `${block.title}：${block.text}`;
        else item.rules.push({ id: crypto.randomUUID(), ...block });
    }
    if (!blocks.length && field(entry, 'details')) { item.rules.push({ id: crypto.randomUUID(), title: '完整规则（待拆分）', text: plainText(field(entry, 'details'), entry.fields) }); warnings.push('规则表格未能拆分，全文已保留在附加规则。'); }
    if (blocks.length && (field(entry, 'details').match(/<table\b/gi)?.length ?? 0) > 1) {
        item.rules.push({ id: crypto.randomUUID(), title: '复合规则原文（待核对）', text: plainText(field(entry, 'details'), entry.fields) });
        warnings.push('含嵌套或多个规则表格，完整正文另存附加规则，请核对次攻击与强化。');
    }
    const attack = item.att?.match(/^([\s\S]*?)\s+(?:vs\.?|对抗)\s*(AC|Fortitude|Reflex|Will|强韧|反射|意志|防御等级)\s*[。.]?$/i);
    if (attack) { item.att = attack[1]; item.def = ({ 强韧: 'Fortitude', 反射: 'Reflex', 意志: 'Will', 防御等级: 'AC' } as Record<string, string>)[attack[2]] ?? attack[2]; item.defLabel = attack[2]; }
    else if (item.att) warnings.push('攻击表达式保留全文，目标防御需人工核对。');
    if (/<<|\{\{/.test(field(entry, 'details'))) warnings.push('规则中包含原版宏或引用，需对照原文核对。');
    Object.assign(item, { templateWarnings: warnings });
    return { module: 'moves', item, warnings };
}
export function adaptTemplate(entry: OriginalEntry, module: ModuleType, sourceVersion: string, powers: ReadonlyMap<string, OriginalEntry> = new Map()): TemplateDraft[] {
    if (!TemplateModules[entry.category].includes(module)) throw new Error('模板类别与目标资源不匹配');
    if (module === 'moves') return [adaptPower(entry, sourceVersion)];
    const item = base(entry, module, sourceVersion), warnings: string[] = [];
    const lines = boldLines(entry);
    const body = originalBody(entry);
    const referenced = (entry.wiki?.transclusions ?? []).filter(ref => !ref.startsWith('!!'));
    const linked = referenced.map(ref => ({ ref, power: powers.get(ref) }));
    const missing = linked.filter(link => !link.power).map(link => link.ref);
    if (missing.length) warnings.push(`未解析的原版引用：${missing.join('、')}。引用已保留在原文。`);
    if (module === 'traditions' || module === 'paths') {
        const progression = item as ProgressionItem;
        progression.req = field(entry, 'prerequisite'); progression.features = []; progression.powers = [];
        const source = field(entry, 'sourceText');
        const sections = [...source.matchAll(/^!!\s+([^\n]+)\n([\s\S]*?)(?=^!!\s|$(?![\s\S]))/gm)];
        progression.description = plainText(source.split(/^!!\s/m)[0], { ...entry.fields, title: entry.name });
        for (const section of sections) {
            const level = section[1].match(/^(\d+)级[：:]\s*(.*)/);
            const refs = [...section[2].matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]);
            const found = refs.map(ref => powers.get(ref)).filter((power): power is OriginalEntry => !!power);
            if (found.length) for (const power of found) {
                const draft = adaptPower(power, sourceVersion); (draft.item as MoveItem).acquiredLevel = level?.[1] ?? String((draft.item as MoveItem).level);
                progression.powers.push(draft.item as MoveItem); warnings.push(...draft.warnings.map(warning => `${power.name}：${warning}`));
            }
            const remaining = section[2].replace(/\{\{([^{}]+)\}\}/g, (match, ref) => powers.has(ref) ? '' : match);
            if (level && plainText(remaining)) progression.features.push({ id: crypto.randomUUID(), level: level[1], name: level[2], desc: plainText(remaining, entry.fields) });
            else if (!level && /不朽|Immortality|终局/i.test(section[1])) { progression.culminationTitle = section[1]; progression.culmination = plainText(section[2], entry.fields); }
        }
        if (!sections.length) { progression.description = body; warnings.push('未识别等级章节，原文已保留在资源说明。'); }
    } else if (module === 'feats') {
        const feat = item as GeneralItem; feat.req = plainText(field(entry, 'prerequisite')); feat.tier = field(entry, 'tierZh') || entry.fields?.tier || '';
        feat.benefit = plainText(field(entry, 'benefit'), entry.fields) || body;
    } else if (module === 'schools') {
        const school = item as SchoolItem; const parsed = schoolFeatures(entry, powers); school.description = parsed.features.length ? [field(entry, 'flavorText'), field(entry, 'details'), parsed.description, field(entry, 'benefit')].filter(Boolean).map(text => plainText(text, entry.fields)).join('\n\n') : body; school.armorProf = lines['防具擅长'] ?? ''; school.weaponProf = lines['武器擅长'] ?? ''; school.defBonus = lines['防御加值'] ?? '';
        school.hpStart = lines['起始HP'] ?? ''; school.hpPerLvl = lines['每级增加HP'] ?? ''; school.surges = lines['每日回复力'] ?? ''; school.trainedSkills = [lines['受训技能'], lines['职业技能']].filter(Boolean).join('\n');
        school.features = parsed.features;
        if (!parsed.features.length) warnings.push('未识别明确的职业特性章节，完整规则保留在门派描述，请核对。');
        else warnings.push('已按原版标题拆分职业特性与等级节点；请核对门派特技中的子选项和获得等级。');
    } else if (module === 'roots') {
        const root = item as RootItem; root.attributes = lines['属性调整'] ?? [field(entry, 'abilityOne', 'race-abilityone'), field(entry, 'abilityTwo', 'race-abilitytwo')].filter(Boolean).map(ability => `+2${ability}`).join('；');
        root.size = field(entry, 'size', 'race-size'); root.speed = field(entry, 'speed', 'race-speed'); root.vision = field(entry, 'vision', 'race-vision'); root.flavor = body;
        warnings.push('种族其他特性保留在原文，请按作者设计分配到根骨／出身／先天命格。');
    } else if (module === 'origins') {
        const origin = item as OriginItem; origin.languages = lines['语言'] ?? ''; origin.skillBonuses = lines['技能奖励'] ?? ''; origin.flavor = body; origin.traits = [];
        warnings.push('语言与技能已拆分；其余种族特性保留全文，需自行分配。');
    } else if (module === 'destinies') {
        const found = linked.filter((link): link is { ref: string; power: OriginalEntry } => !!link.power);
        if (found.length) return found.map(({ power }) => {
            const draft = adaptPower(power, sourceVersion), move = draft.item as MoveItem;
            const destiny = { ...base(power, 'destinies', sourceVersion), name: move.name, flavor: move.flavor, powerType: move.typeLabel ?? ({ basic: '随意', special: '遭遇', ultimate: '每日' })[move.type], action: move.action, actionLabel: move.actionLabel, range: move.range, target: move.target, effect: move.sourceText ?? '' } as DestinyItem;
            const notes = [...warnings, ...draft.warnings, '种族威能全文放入效果；请按先天命格风味修改。'];
            Object.assign(destiny, { templateWarnings: notes, templateParent: { entryId: entry.id, category: 'race' } });
            return { module, item: destiny, warnings: notes };
        });
        const destiny = item as DestinyItem; destiny.powerType = '待核对'; destiny.action = ''; destiny.effect = body; warnings.push('没有解析到种族威能，暂保留种族全文供选择能力。');
    } else if (module === 'items') {
        warnings.push(...adaptEquipment(entry, item as EquipmentItem, powers, power => adaptPower(power, sourceVersion)));
    }
    Object.assign(item, { templateWarnings: warnings });
    return [{ module, item, warnings }];
}

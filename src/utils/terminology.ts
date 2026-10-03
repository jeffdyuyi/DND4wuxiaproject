import seed from '../data/4e-terms.json';
import glossary from '../data/4e-glossary.json';
import { ActionMap, Defenses, Keywords, UsageOptions } from '../constants';

export const TermCategories = {
    source: '力量来源', damage: '伤害类型', effect: '效果关键词', accessory: '器材关键词', other: '其他关键词',
    weaponGroup: '武器组', weapon: '具体武器', implement: '法器', armor: '护甲', slot: '装备部位',
    defense: '防御类型', action: '动作类型', usage: '使用频率', status: '状态与规则术语',
    rule: '常用规则术语', resource: '资源与字段名称', range: '范围与形状', stat: '属性', creature: '生物关键词（扩展）',
} as const;
export type TermCategory = keyof typeof TermCategories;
export interface Term {
    id: string; category: TermCategory; label: string; value: string;
    origin: '4e' | 'wuxia' | 'custom'; reference?: string; source?: string; hidden?: boolean;
    original?: string; replacement?: string; aliases?: string[]; description?: string;
}
export interface Terminology { version: 1; autoCollect: boolean; entries: Term[]; presetRevision?: number; }
export const WuxiaMappings: [TermCategory, string, string][] = [
    ['damage', '强酸', '腐蚀'], ['damage', '力场', '罡劲'], ['damage', '火焰', '纯阳'], ['damage', '寒冰', '纯阴'],
    ['damage', '闪电', '震煞'], ['damage', '毒素', '丹毒'], ['damage', '光耀', '浩然'], ['damage', '暗蚀', '阴煞'], ['damage', '心灵', '胆魄'], ['damage', '雷鸣', '音波'],
    ['effect', '魅惑', '迷魂'], ['effect', '恐惧', '威慑'], ['effect', '变形', '易容'], ['effect', '医疗', '疗伤'],
    ['effect', '传送', '移形'], ['effect', '区域', '阵法'], ['effect', '可靠', '无遗'], ['effect', '睡眠', '点穴'],
    ['accessory', '武器', '兵器'], ['range', '近程', '近距'], ['range', '墙', '气墙'],
];

function applyWuxiaMappings(entries: Term[], upgrade: boolean): Term[] {
    for (const [category, original, replacement] of WuxiaMappings) {
        const term = entries.find(term => term.category === category && (term.original || term.value) === original);
        if (!term) continue;
        if (!upgrade || ((!term.replacement || term.replacement === original) && !term.aliases?.length)) {
            const prior = upgrade ? entries.find(word => word.origin === 'wuxia' && word.category === category && word.value === replacement) : undefined;
            const name = prior?.label || replacement;
            term.replacement = name; term.label = name;
            term.aliases = [...new Set([...(term.aliases || []), ...(prior?.aliases || []), replacement, name])];
            if (prior?.hidden) term.hidden = true;
        }
    }
    const movement = entries.find(term => term.category === 'action' && term.value === 'mov');
    if (movement) {
        if (movement.label === '身法' && movement.replacement === '身法') { movement.label = '移动'; movement.replacement = '移动'; }
        // Only Reflex owns this alias. Old movement snapshots are resolved using stable mov.
        movement.aliases = (movement.aliases || []).filter(alias => alias !== '身法');
    }
    return entries.filter(term => !(term.origin === 'wuxia' && WuxiaMappings.some(([category, original, replacement]) =>
        term.category === category && term.value === replacement && entries.some(base => base.category === category && base.value === original && base.aliases?.includes(replacement)))));
}
export const keywordCategories: TermCategory[] = ['source', 'damage', 'effect', 'accessory', 'other'];
export const splitTerms = (text: string) => [...new Set(text.split(/[,，、;；\n]+/).map(word => word.trim()).filter(Boolean))];
const normalized = (text: string) => text.trim().toLocaleLowerCase();
export function defaultTerminology(): Terminology {
    const entries: Term[] = seed.entries.map(term => ({ ...term, category: term.category as TermCategory,
        id: `4e:${term.category}:${term.label}`, value: term.label, origin: '4e', source: 'source' in term ? String(term.source) : seed.source }));
    for (const [category, words] of Object.entries(Keywords)) for (const label of words) {
        if (!entries.some(term => term.category === category && term.label === label)) entries.push({ id: `wuxia:${category}:${label}`, category: category as TermCategory, label, value: label, origin: 'wuxia' });
    }
    for (const [value, label] of Object.entries(Defenses)) entries.push({ id: `defense:${value}`, category: 'defense', value, label, origin: 'wuxia', reference: value });
    for (const [value, action] of Object.entries(ActionMap)) entries.push({ id: `action:${value}`, category: 'action', value, label: action.t, origin: 'wuxia', reference: value });
    for (const option of UsageOptions) entries.push({ id: `usage:${option.v}`, category: 'usage', value: option.v, label: option.t, origin: '4e', reference: option.t });
    const defenses = { AC: '护甲等级', Reflex: '反射', Fortitude: '强韧', Will: '意志' };
    const actions: Record<string, string> = { std: '标准动作', mov: '移动动作', min: '次要动作', free: '自由动作', react: '即时动作（旧版）', interrupt: '即时打断', reaction: '即时反应', opportunity: '借机动作', none: '无动作' };
    for (const term of entries) {
        term.original = term.category === 'defense' ? defenses[term.value as keyof typeof defenses] : term.category === 'action' ? actions[term.value] : term.category === 'usage' ? UsageOptions.find(option => option.v === term.value)!.t : term.value;
        term.replacement = term.label === term.original ? '' : term.label;
        term.aliases = term.label === term.original ? [] : [term.label];
    }
    for (const word of glossary.entries) {
        const category = word.category as TermCategory;
        const existing = entries.find(term => term.category === category && term.value === word.label);
        if (existing) { existing.description = word.description; existing.source = glossary.source; }
        else entries.push({ id: `4e:${category}:${word.label}`, category, label: word.label, original: word.label, replacement: '', aliases: [], value: word.label, origin: '4e', description: word.description, source: glossary.source });
    }
    const additions: [TermCategory, string, string?][] = [
        ['resource', '威能', '武学招式'], ['resource', '职业', '武林门派'], ['resource', '专长', '武道造诣'], ['resource', '装备', '神兵宝甲'], ['resource', '典范之道', '修行传承'], ['resource', '传奇命运', '成道之途'],
        ...['种族', '背景', '命中', '失手', '目标', '触发', '维持', '特殊', '前提', '特性'].map(word => ['resource', word] as [TermCategory, string]),
        ...['近战', '远程', '近程', '区域', '爆发', '冲击', '墙'].map(word => ['range', word] as [TermCategory, string]),
        ...['力量', '体质', '敏捷', '智力', '感知', '魅力'].map(word => ['stat', word] as [TermCategory, string]),
        ...['抗力', '易伤', '持续伤害', '治疗恢复', '生命值', '豁免检定', '推离', '拉近', '滑动', '命中点'].map(word => ['rule', word] as [TermCategory, string]),
    ];
    for (const [category, original, replacement = ''] of additions) if (!entries.some(term => term.category === category && term.value === original)) entries.push({ id: `4e:${category}:${original}`, category, value: original, original, replacement, label: replacement || original, aliases: replacement ? [replacement] : [], origin: '4e', source: '4E 规则与工具字段' });
    return { version: 1, autoCollect: true, entries: applyWuxiaMappings(entries, false), presetRevision: 1 };
}
export function validateTerminology(value: unknown): Terminology {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('术语库必须是对象');
    const raw = value as Record<string, unknown>;
    if (raw.version !== 1 || typeof raw.autoCollect !== 'boolean' || !Array.isArray(raw.entries)) throw new Error('术语库版本或结构错误');
    if (raw.presetRevision !== undefined && raw.presetRevision !== 1) throw new Error('术语预设版本错误');
    const ids = new Set<string>(), values = new Set<string>(), labels = new Set<string>();
    const entries = raw.entries.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('术语条目必须是对象');
        const term = entry as Term;
        if (typeof term.id !== 'string' || !term.id || !Object.hasOwn(TermCategories, term.category) ||
            typeof term.label !== 'string' || !term.label.trim() || /[,，、;；\n]/.test(term.label) ||
            typeof term.value !== 'string' || !term.value.trim() || !['4e', 'wuxia', 'custom'].includes(term.origin) ||
            (term.hidden !== undefined && typeof term.hidden !== 'boolean') ||
            (term.reference !== undefined && typeof term.reference !== 'string') || (term.source !== undefined && typeof term.source !== 'string') ||
            (term.original !== undefined && (typeof term.original !== 'string' || !term.original.trim())) ||
            (term.replacement !== undefined && (typeof term.replacement !== 'string' || /[,，、;；\n]/.test(term.replacement))) ||
            (term.aliases !== undefined && (!Array.isArray(term.aliases) || term.aliases.some(alias => typeof alias !== 'string' || !alias))) ||
            (term.description !== undefined && typeof term.description !== 'string')) throw new Error('术语字段或分类错误');
        const key = `${term.category}:${normalized(term.value)}`;
        const labelKey = `${term.category}:${normalized(term.label)}`;
        if (ids.has(term.id) || values.has(key) || labels.has(labelKey)) throw new Error('术语 ID、同类标识或名称重复');
        ids.add(term.id); values.add(key); labels.add(labelKey);
        if (term.category === 'usage' && !UsageOptions.some(option => option.v === term.value)) throw new Error('使用频率只能保留随意、遭遇、每日的标识');
        return { ...term, label: term.label.trim() };
    });
    const defaults = defaultTerminology();
    let migrated = entries.map(term => {
        if (term.original !== undefined) return term;
        const baseline = defaults.entries.find(base => base.category === term.category && base.value === term.value);
        const original = baseline?.original || term.value;
        // New preset aliases are not evidence that an old unmodified term was edited.
        const aliases = term.aliases || (term.category === 'defense' || term.category === 'action' ? baseline?.aliases || [] : term.label === original ? [] : [term.label]);
        return { ...term, original, replacement: term.label === original ? '' : term.label, aliases, description: baseline?.description };
    });
    if (raw.presetRevision === undefined) migrated = applyWuxiaMappings(migrated, true);
    // Add newly supported standard terms without replacing local preferences.
    for (const term of defaults.entries) if (!migrated.some(current => current.category === term.category && (current.value === term.value || current.label === term.label || current.aliases?.includes(term.original || term.value)))) migrated.push(term);
    return { version: 1, autoCollect: raw.autoCollect, entries: migrated, presetRevision: 1 };
}
export function addTerms(library: Terminology, category: TermCategory, text: string): Terminology {
    if (category === 'usage') return library;
    const entries = [...library.entries];
    for (const label of splitTerms(text)) {
        if (entries.some(term => term.category === category && (normalized(term.label) === normalized(label) || normalized(term.value) === normalized(label) || term.aliases?.some(alias => normalized(alias) === normalized(label))))) continue;
        entries.push({ id: crypto.randomUUID(), category, label, value: label, original: label, replacement: '', aliases: [], origin: 'custom' });
    }
    return entries.length === library.entries.length ? library : { ...library, entries };
}
export function mergeTerminology(local: Terminology, incoming: Terminology): Terminology {
    const entries = [...local.entries];
    for (const term of incoming.entries) {
        // Imports add suggestions; existing local names and preferences are never silently replaced.
        if (entries.some(current => current.category === term.category && (normalized(current.value) === normalized(term.value) || normalized(current.label) === normalized(term.label)))) continue;
        entries.push({ ...term, id: entries.some(current => current.id === term.id) ? crypto.randomUUID() : term.id });
    }
    return { ...local, entries };
}

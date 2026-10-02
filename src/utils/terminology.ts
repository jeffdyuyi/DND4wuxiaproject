import seed from '../data/4e-terms.json';
import { ActionMap, Defenses, Keywords, UsageOptions } from '../constants';

export const TermCategories = {
    source: '力量来源', damage: '伤害类型', effect: '效果关键词', accessory: '器材关键词', other: '其他关键词',
    weaponGroup: '武器组', weapon: '具体武器', implement: '法器', armor: '护甲', slot: '装备部位',
    defense: '防御类型', action: '动作类型', usage: '使用频率', status: '状态与规则术语',
} as const;
export type TermCategory = keyof typeof TermCategories;
export interface Term {
    id: string; category: TermCategory; label: string; value: string;
    origin: '4e' | 'wuxia' | 'custom'; reference?: string; source?: string; hidden?: boolean;
}
export interface Terminology { version: 1; autoCollect: boolean; entries: Term[]; }
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
    return { version: 1, autoCollect: true, entries };
}
export function validateTerminology(value: unknown): Terminology {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('术语库必须是对象');
    const raw = value as Record<string, unknown>;
    if (raw.version !== 1 || typeof raw.autoCollect !== 'boolean' || !Array.isArray(raw.entries)) throw new Error('术语库版本或结构错误');
    const ids = new Set<string>(), values = new Set<string>(), labels = new Set<string>();
    const entries = raw.entries.map((entry: unknown) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('术语条目必须是对象');
        const term = entry as Term;
        if (typeof term.id !== 'string' || !term.id || !Object.hasOwn(TermCategories, term.category) ||
            typeof term.label !== 'string' || !term.label.trim() || /[,，、;；\n]/.test(term.label) ||
            typeof term.value !== 'string' || !term.value.trim() || !['4e', 'wuxia', 'custom'].includes(term.origin) ||
            (term.hidden !== undefined && typeof term.hidden !== 'boolean') ||
            (term.reference !== undefined && typeof term.reference !== 'string') || (term.source !== undefined && typeof term.source !== 'string')) throw new Error('术语字段或分类错误');
        const key = `${term.category}:${normalized(term.value)}`;
        const labelKey = `${term.category}:${normalized(term.label)}`;
        if (ids.has(term.id) || values.has(key) || labels.has(labelKey)) throw new Error('术语 ID、同类标识或名称重复');
        ids.add(term.id); values.add(key); labels.add(labelKey);
        if (term.category === 'usage' && !UsageOptions.some(option => option.v === term.value)) throw new Error('使用频率只能保留随意、遭遇、每日的标识');
        return { ...term, label: term.label.trim() };
    });
    return { version: 1, autoCollect: raw.autoCollect, entries };
}
export function addTerms(library: Terminology, category: TermCategory, text: string): Terminology {
    if (category === 'usage') return library;
    const entries = [...library.entries];
    for (const label of splitTerms(text)) {
        if (entries.some(term => term.category === category && (normalized(term.label) === normalized(label) || normalized(term.value) === normalized(label)))) continue;
        entries.push({ id: crypto.randomUUID(), category, label, value: label, origin: 'custom' });
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

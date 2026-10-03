import type { DB, Item, MoveItem } from '../types';
import { Config, type ModuleType } from '../constants';
import { createResource, duplicateResource, emptyDB, modules, withItems } from './resources';
import { validateTerminology, type Terminology } from './terminology';
import { isHeaderColor } from './card-colors';

export const SCHEMA_VERSION = 1;
export type ImportMode = 'skip' | 'overwrite' | 'copy';
export interface Archive { schemaVersion: 1; exportedAt: string; data: Partial<DB>; terminology?: Terminology; }
const recordOf = (value: unknown, path: string): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} 必须是对象`);
    return value as Record<string, unknown>;
};
const stringKeys: Record<ModuleType, string[]> = {
    moves: ['cls', 'action', 'range', 'keywords', 'trigger', 'target', 'att', 'def', 'hit', 'miss', 'effect', 'sustain', 'special', 'acquiredLevel'],
    items: ['type', 'price', 'slot', 'enhance', 'crit', 'prop', 'power'],
    schools: ['description', 'armorProf', 'weaponProf', 'defBonus', 'hpStart', 'hpPerLvl', 'surges', 'trainedSkills'],
    roots: ['attributes', 'size', 'speed', 'vision'], origins: ['languages', 'skillBonuses'],
    destinies: ['powerType', 'action', 'range', 'target', 'effect'],
    feats: ['tier', 'stats', 'traits', 'powerName', 'powerDesc', 'skills', 'benefit', 'req'],
    traditions: ['entryLevel', 'req', 'description', 'culminationTitle', 'culmination'],
    paths: ['entryLevel', 'req', 'description', 'culminationTitle', 'culmination']
};
function textFields(record: Record<string, unknown>, keys: string[], path: string): void {
    for (const key of keys) if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error(`${path}.${key} 必须是文本`);
}
function normalizeRows(value: unknown, level: boolean, path: string): (Record<string, unknown> & { id: string; name: string; desc: string; level?: string })[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error(`${path} 必须是数组`);
    const ids = new Set<string>();
    return value.map((row, index) => {
        const record = recordOf(row, `${path}[${index + 1}]`);
        textFields(record, ['id', 'name', 'desc', 'title', 'text'], path);
        let id = typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID();
        if (ids.has(id)) id = crypto.randomUUID();
        ids.add(id);
        if (level && record.level !== undefined && !['number', 'string'].includes(typeof record.level)) throw new Error(`${path}.level 必须是等级文本`);
        return { ...record, id, name: String(record.name ?? ''), desc: String(record.desc ?? ''), ...(level ? { level: String(record.level ?? '') } : {}) };
    });
}
/** Validate editing structure, not the balance or legality of authored rules. */
export function normalizeResource(module: ModuleType, value: unknown, path: string = Config[module].title): Item {
    const raw = recordOf(value, path);
    textFields(raw, ['id', 'name', 'flavor', 'source', 'sourceText', 'actionLabel', 'defLabel', 'typeLabel'], path);
    if (typeof raw.name !== 'string') throw new Error(`${path}.name 缺失`);
    const data = { ...raw };
    if (data.headerColor !== undefined) {
        if (!isHeaderColor(data.headerColor)) throw new Error(`${path}.headerColor 必须是 #RRGGBB 格式的颜色`);
        data.headerColor = data.headerColor.toUpperCase();
    }
    if ((module === 'traditions' || module === 'paths') && typeof data.entryLevel === 'number') data.entryLevel = String(data.entryLevel);
    textFields(data, stringKeys[module], path);
    if (module === 'moves' || module === 'items') {
        const level = data.level === undefined ? 1 : Number(data.level);
        if (!['undefined', 'string', 'number'].includes(typeof data.level) || !Number.isInteger(level) || level < 0) throw new Error(`${path}.level 必须是非负整数`);
        data.level = level;
    }
    if (module === 'moves') {
        if (data.type !== undefined && !['basic', 'special', 'ultimate'].includes(String(data.type))) throw new Error(`${path}.type 不是支持的使用频率`);
        const defenses: Record<string, string> = { 格挡: 'AC', 身法: 'Reflex', 护体: 'Fortitude', 定力: 'Will', 强韧: 'Fortitude', 反射: 'Reflex', 意志: 'Will' };
        if (typeof data.def === 'string') data.def = defenses[data.def] ?? data.def;
        const rows = normalizeRows(data.rules, false, `${path}.rules`);
        data.rules = rows.map(row => ({ ...row, title: String(row.title ?? ''), text: String(row.text ?? '') }));
    }
    if (module === 'moves' || module === 'destinies') {
        const actions: Record<string, string> = { 标准动作: 'std', 出招: 'std', 移动动作: 'mov', 身法: 'mov', 次要动作: 'min', 瞬息: 'min', 自由动作: 'free', 随心: 'free', 即时打断: 'interrupt', 即时反应: 'reaction', 借机动作: 'opportunity', 无动作: 'none', 变招: 'react' };
        if (typeof data.action === 'string') data.action = actions[data.action] ?? data.action;
    }
    if (module === 'schools') data.features = normalizeRows(data.features, false, `${path}.features`);
    if (module === 'origins') data.traits = normalizeRows(data.traits, false, `${path}.traits`);
    if (module === 'traditions' || module === 'paths') {
        data.features = normalizeRows(data.features, true, `${path}.features`);
        if (data.powers !== undefined && !Array.isArray(data.powers)) throw new Error(`${path}.powers 必须是数组`);
        const ids = new Set<string>();
        data.powers = ((data.powers as unknown[] | undefined) ?? []).map((power, index) => {
            let next = normalizeResource('moves', power, `${path}.powers[${index + 1}]`) as MoveItem;
            if (next.acquiredLevel === undefined) next.acquiredLevel = String(next.level);
            if (ids.has(next.id)) next = duplicateResource(next);
            ids.add(next.id); return next;
        });
    }
    return { ...createResource(module), ...data, id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID() } as Item;
}
export function readArchive(value: unknown): Partial<DB> {
    const root = recordOf(value, '备份');
    if (root.schemaVersion !== undefined && root.schemaVersion !== SCHEMA_VERSION) throw new Error(`不支持备份版本 ${String(root.schemaVersion)}，请使用对应版本的工具`);
    const data = root.schemaVersion === undefined ? root : recordOf(root.data, '备份.data');
    let result = emptyDB();
    let recognized = 0;
    for (const module of modules) {
        if (!Object.hasOwn(data, module)) continue;
        recognized++;
        if (!Array.isArray(data[module])) throw new Error(`${Config[module].title} 必须是数组`);
        result = withItems(result, module, (data[module] as unknown[]).map((item, index) => normalizeResource(module, item, `${Config[module].title}[${index + 1}]`)));
    }
    if (!recognized) throw new Error('文件不包含可识别的资源库');
    return result;
}
export function readLibraryArchive(value: unknown): { data: Partial<DB>; terminology?: Terminology } {
    const root = recordOf(value, '备份');
    const terminology = root.terminology === undefined ? undefined : validateTerminology(root.terminology);
    if (root.schemaVersion !== undefined && root.schemaVersion !== SCHEMA_VERSION) throw new Error('不支持此备份版本');
    const termsOnly = terminology && root.schemaVersion === SCHEMA_VERSION && root.data && typeof root.data === 'object' && !Array.isArray(root.data) && Object.keys(root.data).length === 0;
    return { data: termsOnly ? {} : readArchive(value), ...(terminology ? { terminology } : {}) };
}
export function makeArchive(data: Partial<DB>, terminology?: Terminology): Archive {
    return { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data, ...(terminology ? { terminology } : {}) };
}
/** Count import decisions without cloning resources or allocating draft IDs. */
export function summarizeImport(db: DB, incoming: Partial<DB>, mode: ImportMode) {
    let added = 0, replaced = 0, skipped = 0;
    for (const module of modules) {
        const ids = new Set(db[module].map(item => item.id));
        for (const item of incoming[module] ?? []) {
            if (mode === 'copy' || !ids.has(item.id)) added++;
            else if (mode === 'overwrite') replaced++;
            else skipped++;
            ids.add(item.id);
        }
    }
    return { added, replaced, skipped };
}
export function mergeResources(db: DB, incoming: Partial<DB>, mode: ImportMode) {
    let next = db;
    let added = 0, replaced = 0, skipped = 0;
    for (const module of modules) {
        const items: Item[] = [...next[module]];
        const positions = new Map(items.map((item, index) => [item.id, index]));
        for (const item of incoming[module] ?? []) {
            const index = positions.get(item.id);
            if (mode === 'copy') {
                const copy = duplicateResource(item); items.push(copy); positions.set(copy.id, items.length - 1); added++;
            } else if (index !== undefined) {
                if (mode === 'overwrite') { items[index] = item; replaced++; } else skipped++;
            } else { items.push(item); positions.set(item.id, items.length - 1); added++; }
        }
        next = withItems(next, module, items);
    }
    return { db: next, added, replaced, skipped };
}
export function downloadJSON(value: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

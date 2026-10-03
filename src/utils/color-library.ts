import type { Item, ProgressionItem } from '../types';
import { isHeaderColor, POWER_HEADER_COLORS, TYPE_HEADER_COLORS } from './card-colors';
import type { StoragePort } from './storage';

export interface SavedColor { id: string; name: string; color: string; }
export const COLOR_LIBRARY_KEY = 'wuxia_title_colors_v1';
export const BUILTIN_COLORS: SavedColor[] = [
    { id: 'phb-basic', name: '随意威能 · 手册绿', color: POWER_HEADER_COLORS.basic },
    { id: 'phb-special', name: '遭遇威能 · 手册红', color: POWER_HEADER_COLORS.special },
    { id: 'phb-ultimate', name: '每日威能 · 灰褐', color: POWER_HEADER_COLORS.ultimate },
    ...(['items', 'schools', 'roots', 'origins', 'destinies', 'feats', 'traditions', 'paths'] as const).map((type, index) => ({
        id: `type-${type}`, name: ['神兵 · 金橙', '门派 · 深蓝', '根骨 · 松柏绿', '出身 · 赭石棕', '命格 · 黛紫', '造诣 · 青灰', '传承 · 深青', '成道 · 绛红'][index], color: TYPE_HEADER_COLORS[type],
    })),
];
export function validateColorLibrary(value: unknown): SavedColor[] {
    if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 || !('colors' in value) || !Array.isArray(value.colors)) throw new Error('配色库格式或版本不支持');
    const ids = new Set<string>(), colors = new Set<string>();
    return value.colors.map(entry => {
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string' || !entry.name.trim() || entry.name.trim().length > 40 || !isHeaderColor(entry.color)) throw new Error('配色必须包含 ID、名称和 #RRGGBB 色值');
        const color = entry.color.toUpperCase();
        if (ids.has(entry.id) || colors.has(color)) throw new Error('配色库包含重复配色');
        ids.add(entry.id); colors.add(color);
        return { ...entry, name: entry.name.trim(), color } as SavedColor;
    });
}
export function loadColorLibrary(storage: StoragePort): { colors: SavedColor[]; error: string; raw: string | null } {
    let raw: string | null = null;
    try {
        raw = storage.getItem(COLOR_LIBRARY_KEY);
        return { colors: raw === null ? [] : validateColorLibrary(JSON.parse(raw)), error: '', raw: null };
    } catch { return { colors: [], error: '配色库无法读取，已停止覆盖原始数据。', raw }; }
}
export function saveColorLibrary(storage: StoragePort, colors: SavedColor[]): { ok: boolean; error: string } {
    try { storage.setItem(COLOR_LIBRARY_KEY, JSON.stringify({ schemaVersion: 1, colors: validateColorLibrary({ schemaVersion: 1, colors }) })); return { ok: true, error: '' }; }
    catch { return { ok: false, error: '配色库未保存，请检查存储权限或空间后重试。' }; }
}
export function upsertColor(colors: SavedColor[], name: string, color: string): SavedColor[] {
    if (!name.trim() || name.trim().length > 40 || !isHeaderColor(color)) throw new Error('请输入 1–40 字的配色名称和完整色值');
    const existing = colors.find(entry => entry.color.toUpperCase() === color.toUpperCase());
    const next = { id: existing?.id ?? crypto.randomUUID(), name: name.trim(), color: color.toUpperCase() };
    return existing ? colors.map(entry => entry.id === existing.id ? next : entry) : [...colors, next];
}
export function applyColorToItems(items: Item[], ids: string[], color?: string, includePowers = false): Item[] {
    if (color !== undefined && !isHeaderColor(color)) throw new Error('配色格式无效');
    const selected = new Set(ids);
    const apply = <T extends Item>(item: T): T => {
        const next = { ...item };
        if (color === undefined) delete next.headerColor; else next.headerColor = color.toUpperCase();
        return next;
    };
    return items.map(item => {
        if (!selected.has(item.id)) return item;
        const next = apply(item);
        if (includePowers && Array.isArray(item.powers)) (next as ProgressionItem).powers = (item as ProgressionItem).powers.map(apply);
        return next;
    });
}

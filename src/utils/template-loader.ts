import { TemplateCategories, type OriginalEntry, type TemplateIndex, type TemplateSummary } from './templates';

const chunks = new Map<string, OriginalEntry[]>();
let imported: { index: TemplateIndex; rows: OriginalEntry[] } | null = null;
export function importTemplatePack(value: unknown): TemplateIndex {
    if (!value || typeof value !== 'object') throw new Error('资料包必须是 JSON 对象');
    const pack = value as { version?: number; sourceVersion?: string; originals?: OriginalEntry[] };
    if (pack.version !== 1 || typeof pack.sourceVersion !== 'string' || !Array.isArray(pack.originals) || !pack.originals.length || pack.originals.length > 100000) throw new Error('资料包版本、来源或条目数量无效');
    const ids = new Set<string>();
    for (const entry of pack.originals) {
        if (!entry || typeof entry.id !== 'string' || !entry.id || typeof entry.name !== 'string' || !entry.name || !Object.hasOwn(TemplateCategories, entry.category)) throw new Error('资料包条目缺少有效 ID、名称或类别');
        const key = `${entry.category}:${entry.id}`;
        if (ids.has(key)) throw new Error('资料包包含重复条目 ID');
        ids.add(key);
        if (entry.fields && (typeof entry.fields !== 'object' || Object.values(entry.fields).some(value => typeof value !== 'string'))) throw new Error('原版字段必须是文本');
        if (entry.wiki?.transclusions && (!Array.isArray(entry.wiki.transclusions) || entry.wiki.transclusions.some(ref => typeof ref !== 'string'))) throw new Error('原版引用格式错误');
    }
    const rows = structuredClone(pack.originals);
    const index: TemplateIndex = { version: 1, dataset: 'user-import', sourceVersion: pack.sourceVersion, entries: rows.map(entry => ({ id: entry.id, name: entry.name, nameEn: typeof entry.nameEn === 'string' ? entry.nameEn : '', category: entry.category, source: typeof entry.source === 'string' ? entry.source : '', level: String(entry.level ?? entry.itemLevel ?? entry.fields?.level ?? ''), keywords: String(entry.keywords ?? entry.fields?.keywords ?? ''), file: 'imported.json' })) };
    imported = { index, rows };
    return index;
}
async function readJSON(base: string, file: string, signal: AbortSignal) {
    if (!/^[a-z\d-]+\.json$/.test(file)) throw new Error('模板文件名无效');
    const response = await fetch(`${base}4e-templates/${file}`, { signal });
    if (!response.ok) throw new Error(`模板加载失败（${response.status}），请重试`);
    return response.json();
}
export async function loadTemplateIndex(base: string, signal: AbortSignal): Promise<TemplateIndex> {
    if (imported) return imported.index;
    const value = await readJSON(base, 'index.json', signal) as TemplateIndex;
    if (value.version !== 1 || !Array.isArray(value.entries) || typeof value.sourceVersion !== 'string') throw new Error('模板索引格式错误');
    for (const entry of value.entries) if (!entry || typeof entry.id !== 'string' || typeof entry.name !== 'string' || typeof entry.file !== 'string' || !Object.hasOwn(TemplateCategories, entry.category)) throw new Error('模板索引条目无效');
    return value;
}
async function readChunk(base: string, file: string, signal: AbortSignal) {
    if (file === 'imported.json' && imported) return imported.rows;
    const key = `${base}${file}`;
    const cached = chunks.get(key);
    if (cached) return cached;
    const value = await readJSON(base, file, signal) as OriginalEntry[];
    if (!Array.isArray(value) || value.some(entry => !entry || typeof entry.id !== 'string' || typeof entry.name !== 'string' || !Object.hasOwn(TemplateCategories, entry.category))) throw new Error('模板正文格式错误');
    if (!signal.aborted) {
        chunks.set(key, value);
        if (chunks.size > 8) chunks.delete(chunks.keys().next().value!);
    }
    return value;
}
export async function loadTemplate(base: string, summary: TemplateSummary, index: TemplateIndex, signal: AbortSignal) {
    const rows = await readChunk(base, summary.file, signal);
    const original = rows.find(entry => entry.id === summary.id && entry.category === summary.category);
    if (!original) throw new Error('索引对应的原版条目不存在，请刷新后重试');
    const powerEntries = index.entries.filter(entry => entry.category === 'power');
    const exact = new Map(powerEntries.map(entry => [entry.id, entry]));
    const names = new Map<string, TemplateSummary[]>();
    for (const entry of powerEntries) names.set(entry.name, [...(names.get(entry.name) ?? []), entry]);
    const dependencies = new Map<string, TemplateSummary>();
    for (const ref of original.wiki?.transclusions ?? []) {
        const entry = exact.get(ref) ?? (names.get(ref)?.length === 1 ? names.get(ref)?.[0] : undefined);
        if (entry) dependencies.set(ref, entry);
    }
    const powers = new Map<string, OriginalEntry>();
    // Sequential fetches cap network pressure when a class references many powers.
    for (const file of new Set([...dependencies.values()].map(entry => entry.file))) {
        const rows = await readChunk(base, file, signal);
        for (const [ref, summary] of dependencies) if (summary.file === file) {
            const power = rows.find(entry => entry.id === summary.id && entry.category === 'power');
            if (power) powers.set(ref, power);
        }
    }
    return { original, powers };
}

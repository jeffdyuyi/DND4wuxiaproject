import { unzipSync, zipSync } from 'fflate';
import type { ModuleType } from '../constants';
import { makeArchive, readLibraryArchive } from './archive';
import { modules, emptyDB, withItems } from './resources';
import { readCardPNG } from './card-png';
import { adaptTemplate, TemplateModules, type OriginalEntry } from './templates';
import { prepareTemplatePack } from './template-loader';

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export function safeFilename(name: string) { return (Array.from(name).map(char => char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char).join('').replace(/[. ]+$/, '').slice(0, 70) || '吾侠卡片'); }
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function packFiles(files: Record<string, Uint8Array>) { return zipSync(files, { level: 0 }); }
export function readCardValue(value: unknown, target?: ModuleType) {
    const root = value as { version?: number; sourceVersion?: string; originals?: OriginalEntry[]; category?: string } | null;
    if (Array.isArray(value) || root?.originals || root?.category) {
        if (!target) throw new Error('请在对应工具页面使用“导入 4E 模板”，指定转换类目');
        const originals = Array.isArray(value) ? value : root?.originals ?? [value];
        const prepared = prepareTemplatePack({ version: root?.version ?? 1, sourceVersion: root?.sourceVersion ?? '4E JSON 直接导入', originals });
        const powers = new Map<string, OriginalEntry>();
        for (const row of prepared.rows.filter(row => row.category === 'power')) powers.set(row.id, row);
        const names = new Map<string, OriginalEntry[]>();
        for (const row of powers.values()) names.set(row.name, [...(names.get(row.name) ?? []), row]);
        for (const [name, rows] of names) if (rows.length === 1 && !powers.has(name)) powers.set(name, rows[0]);
        const items = prepared.rows.filter(row => TemplateModules[row.category].includes(target)).flatMap(row => adaptTemplate(row, target, prepared.index.sourceVersion, powers).map(draft => draft.item));
        if (!items.length) throw new Error('此文件没有适用于当前工具的 4E 条目');
        return readLibraryArchive(makeArchive({ [target]: items }));
    }
    return readLibraryArchive(value);
}
export function readCardBytes(bytes: Uint8Array, filename: string, target?: ModuleType) {
    if (bytes.length > MAX_FILE_BYTES) throw new Error('文件超过 100 MB，请拆分后导入');
    if (/\.zip$/i.test(filename)) {
        let total = 0, count = 0;
        const files = unzipSync(bytes, { filter: entry => {
            if (!/\.(json|png)$/i.test(entry.name)) return false;
            total += entry.originalSize; count++;
            if (total > MAX_FILE_BYTES || count > 500) throw new Error('ZIP 解包超过 100 MB 或 500 个文件');
            return true;
        } });
        let data = emptyDB(); const seen = new Map<string, string>();
        for (const [name, content] of Object.entries(files)) {
            const incoming = readCardBytes(content, name, target);
            if (incoming.terminology) throw new Error('含术语的整库备份请单独导入 JSON，不与卡片 ZIP 混合');
            for (const module of modules) for (const item of incoming.data[module] ?? []) {
                const key = `${module}:${item.id}`, json = JSON.stringify(item);
                if (seen.has(key) && seen.get(key) !== json) throw new Error('ZIP 内同一 ID 的卡片数据不同，请拆开导入');
                if (!seen.has(key)) { data = withItems(data, module, [...data[module], item]); seen.set(key, json); }
            }
        }
        if (!seen.size) throw new Error('ZIP 中没有可导入的卡片');
        return { data };
    }
    const value = /\.png$/i.test(filename) ? readCardPNG(bytes) : JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''));
    return readCardValue(value, target);
}

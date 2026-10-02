
import { Config } from '../constants';
import type { DB } from '../types';
import { emptyDB, modules, withItems, duplicateResource } from './resources';
import { readArchive, makeArchive, normalizeResource } from './archive';

export const STORAGE_KEY = 'wuxia_resources_v1';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; }
// Access the browser getter inside the guarded read/write operations.
export const browserStorage: StoragePort = {
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
};
export interface LibraryLoad { db: DB; recovery: Record<string, string>; issues: string[]; }

export function loadLibrary(storage: StoragePort): LibraryLoad {
    const result: LibraryLoad = { db: emptyDB(), recovery: {}, issues: [] };
    let archive: string | null;
    try { archive = storage.getItem(STORAGE_KEY); }
    catch { result.issues.push('无法读取浏览器存储，请检查浏览器权限'); return result; }
    if (archive !== null) {
        result.recovery[STORAGE_KEY] = archive;
        try {
            result.db = { ...emptyDB(), ...readArchive(JSON.parse(archive)) };
            for (const module of modules) {
                const ids = new Set<string>();
                result.db = withItems(result.db, module, result.db[module].map(item => {
                    const next = ids.has(item.id) ? duplicateResource(item) : item;
                    ids.add(next.id); return next;
                }));
            }
            result.recovery = {};
        } catch (error) { result.issues.push(`资源库无法读取：${error instanceof Error ? error.message : '未知错误'}`); }
        return result;
    }
    // Read old keys without rewriting their original bytes.
    for (const module of modules) {
        try {
            const raw = storage.getItem(Config[module].key);
            if (raw === null) continue;
            result.recovery[Config[module].key] = raw;
            const value: unknown = JSON.parse(raw);
            if (!Array.isArray(value)) throw new Error('资源库不是数组');
            const ids = new Set<string>();
            const items = value.map((item, index) => {
                let next = normalizeResource(module, item, `${Config[module].title}[${index + 1}]`);
                if (ids.has(next.id)) next = duplicateResource(next);
                ids.add(next.id); return next;
            });
            result.db = withItems(result.db, module, items);
        } catch (error) { result.issues.push(`${Config[module].title}读取失败：${error instanceof Error ? error.message : '未知错误'}`); }
    }
    if (!result.issues.length) result.recovery = {};
    return result;
}
export function saveLibrary(storage: StoragePort, db: DB): { ok: true } | { ok: false; error: string } {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(makeArchive(db))); return { ok: true }; }
    catch (error) {
        const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
        return { ok: false, error: name === 'QuotaExceededError' ? '存储空间已满，修改尚未保存。请导出备份后释放空间。' : '浏览器存储不可用，修改尚未保存。请导出备份或重试。' };
    }
}

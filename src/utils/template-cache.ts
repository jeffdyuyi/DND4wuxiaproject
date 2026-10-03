import { prepareTemplatePack, type TemplatePack } from './template-loader';

export interface PackInfo { id: string; name: string; source: string; sourceVersion: string; count: number; bytes: number; downloadedAt: string; hash: string; }
const DB_NAME = 'wuxia_template_cache_v1';
async function openCache(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') throw new Error('浏览器不支持资料缓存，请改用支持 IndexedDB 的浏览器');
    return new Promise((resolve, reject) => {
        let blocked = false;
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            for (const name of ['packs', 'info', 'settings']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
        };
        request.onerror = () => reject(new Error('资料缓存无法打开，请检查浏览器存储权限'));
        request.onblocked = () => { blocked = true; reject(new Error('资料缓存被其他页面占用，请关闭旧页面后重试')); };
        request.onsuccess = () => { const db = request.result; if (blocked) { db.close(); return; } db.onversionchange = () => db.close(); resolve(db); };
    });
}
async function transaction<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
    const db = await openCache();
    return new Promise((resolve, reject) => {
        let value: T;
        const tx = db.transaction(stores, mode);
        tx.oncomplete = () => { db.close(); resolve(value); };
        tx.onabort = () => { db.close(); reject(new Error(tx.error?.name === 'QuotaExceededError' ? '浏览器空间不足，原有资料仍保留；请清理缓存或导出备份后重试' : '资料缓存操作失败，原有资料仍保留')); };
        try { work(tx, result => { value = result; }); } catch (error) { tx.abort(); db.close(); reject(error); }
    });
}
export function listPacks() { return transaction<PackInfo[]>(['info'], 'readonly', (tx, result) => { const request = tx.objectStore('info').getAll(); request.onsuccess = () => result(request.result); }); }
export function readPack(id: string) { return transaction<TemplatePack | undefined>(['packs'], 'readonly', (tx, result) => { const request = tx.objectStore('packs').get(id); request.onsuccess = () => result(request.result); }); }
export function readSetting<T>(key: string) { return transaction<T | undefined>(['settings'], 'readonly', (tx, result) => { const request = tx.objectStore('settings').get(key); request.onsuccess = () => result(request.result); }); }
export function writeSetting(key: string, value: unknown) { return transaction<void>(['settings'], 'readwrite', tx => { tx.objectStore('settings').put(value, key); }); }
export async function savePack(pack: TemplatePack, identity: { id: string; name: string; source: string }) {
    const prepared = prepareTemplatePack(pack);
    const snapshot: TemplatePack = { version: 1, sourceVersion: pack.sourceVersion, originals: prepared.rows };
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const info: PackInfo = { ...identity, sourceVersion: pack.sourceVersion, count: prepared.rows.length, bytes: bytes.byteLength, downloadedAt: new Date().toISOString(), hash: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') };
    await transaction<void>(['packs', 'info', 'settings'], 'readwrite', tx => {
        tx.objectStore('packs').put(snapshot, info.id); tx.objectStore('info').put(info, info.id); tx.objectStore('settings').put(info.id, 'active');
    });
    return info;
}
export function deletePack(id: string) { return transaction<void>(['packs', 'info', 'settings'], 'readwrite', tx => {
    tx.objectStore('packs').delete(id); tx.objectStore('info').delete(id);
    const request = tx.objectStore('settings').get('active'); request.onsuccess = () => { if (request.result === id) tx.objectStore('settings').delete('active'); };
}); }
export function formatBytes(bytes: number) { if (bytes < 1024) return `${bytes} B`; const unit = bytes < 1024 ** 2 ? 1024 : bytes < 1024 ** 3 ? 1024 ** 2 : 1024 ** 3; return `${(bytes / unit).toFixed(1)} ${unit === 1024 ? 'KB' : unit === 1024 ** 2 ? 'MB' : 'GB'}`; }

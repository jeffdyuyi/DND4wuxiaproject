import type { ModuleType } from '../constants';
import type { DB, Item } from '../types';
import { makeArchive, normalizeResource } from './archive';
import { loadLibrary, STORAGE_KEY, type LibraryLoad, type StoragePort } from './storage';
import type { Terminology } from './terminology';
import { modules } from './resources';

export const AUTHOR_DATABASE = 'wuxia_author_v1';
export interface AuthorRecord { revision: number; text: string; updatedAt: number; }
export interface EditorDraft { module: ModuleType; item: Item; }
export interface DraftRecord extends EditorDraft { id: string; updatedAt: number; }
export interface DraftLoad { drafts: DraftRecord[]; invalid: { id: string; raw: string }[]; }

export function supportsAuthorStorage() {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
}
function openAuthor(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        let abandoned = false;
        const request = indexedDB.open(AUTHOR_DATABASE, 1);
        request.onupgradeneeded = () => {
            for (const store of ['library', 'drafts']) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store);
        };
        request.onerror = () => reject(new Error('作者存档无法打开，请检查浏览器存储权限'));
        request.onblocked = () => { abandoned = true; reject(new Error('作者存档被旧页面占用，请关闭旧页面后重试')); };
        request.onsuccess = () => {
            const db = request.result;
            if (abandoned) { db.close(); return; }
            db.onversionchange = () => db.close(); resolve(db);
        };
    });
}
async function transaction<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction, result: (value: T) => void, fail: (error: Error) => void) => void): Promise<T> {
    const db = await openAuthor();
    return new Promise((resolve, reject) => {
        let value: T, failure: unknown;
        const tx = db.transaction(stores, mode);
        tx.oncomplete = () => { db.close(); resolve(value); };
        tx.onabort = () => {
            db.close();
            const cause = failure ?? tx.error;
            if (cause && typeof cause === 'object' && 'name' in cause && cause.name === 'QuotaExceededError') reject(new Error('浏览器空间不足，原存档仍保留。请导出备份后重试。'));
            else reject(failure ?? new Error('作者存档操作失败，原存档仍保留。请导出备份或重试。'));
        };
        try { work(tx, result => { value = result; }, error => { failure = error; tx.abort(); }); }
        catch (error) { failure = error; tx.abort(); }
    });
}
export function readAuthorRecord() {
    return transaction<unknown>(['library'], 'readonly', (tx, result) => {
        const request = tx.objectStore('library').get('current'); request.onsuccess = () => result(request.result);
    });
}
const revisionOf = (record: unknown) => record && typeof record === 'object' && 'revision' in record && Number.isSafeInteger(record.revision) && Number(record.revision) > 0 ? Number(record.revision) : 0;

/** Compare and write in one transaction: another tab must never be silently overwritten. */
export async function writeAuthorRecord(db: DB, terminology: Terminology, expectedRevision: number, clearDrafts: string[] = []) {
    const text = JSON.stringify(makeArchive(db, terminology));
    return transaction<AuthorRecord>(['library', 'drafts'], 'readwrite', (tx, result, fail) => {
        const store = tx.objectStore('library'), request = store.get('current');
        request.onsuccess = () => {
            try {
                if (revisionOf(request.result) !== expectedRevision) {
                    fail(new Error('存档已被其他标签页修改。请先导出当前数据，再刷新核对，避免覆盖新版本。')); return;
                }
                const record = { revision: expectedRevision + 1, text, updatedAt: Date.now() };
                store.put(record, 'current');
                for (const id of clearDrafts) tx.objectStore('drafts').delete(id);
                result(record);
            } catch (error) { fail(error instanceof Error ? error : new Error('作者存档写入失败')); }
        };
    });
}
export function decodeAuthorRecord(record: unknown): { loaded: LibraryLoad; revision: number } {
    const revision = revisionOf(record);
    if (!record || typeof record !== 'object' || !('text' in record) || typeof record.text !== 'string' || !revision) {
        const raw = JSON.stringify(record) ?? String(record);
        const loaded = loadLibrary({ getItem: key => key === STORAGE_KEY ? '{}' : null, setItem: () => {} });
        return { revision, loaded: { ...loaded, issues: ['作者存档结构损坏，已暂停保存'], recovery: { indexedDB: raw } } };
    }
    const text = record.text;
    return { revision, loaded: loadLibrary({ getItem: key => key === STORAGE_KEY ? text : null, setItem: () => {} }) };
}

export async function initializeAuthor(storage: StoragePort) {
    const current = await readAuthorRecord();
    if (current !== undefined) return decodeAuthorRecord(current);
    const loaded = loadLibrary(storage);
    if (loaded.issues.length) return { loaded, revision: 0 };
    try {
        const record = await writeAuthorRecord(loaded.db, loaded.terminology, 0);
        return { loaded, revision: record.revision };
    } catch (error) {
        // A concurrent first migration may already have committed. Read its result.
        const winner = await readAuthorRecord();
        if (winner !== undefined) return decodeAuthorRecord(winner);
        throw error;
    }
}

export function writeEditorDraft(id: string, draft: EditorDraft, replaceId?: string) {
    const record: DraftRecord = { id, ...structuredClone(draft), updatedAt: Date.now() };
    return transaction<void>(['drafts'], 'readwrite', tx => {
        tx.objectStore('drafts').put(record, id);
        if (replaceId && replaceId !== id) tx.objectStore('drafts').delete(replaceId);
    });
}
export function deleteEditorDrafts(ids: string[]) {
    return transaction<void>(['drafts'], 'readwrite', tx => { for (const id of ids) tx.objectStore('drafts').delete(id); });
}
export function readEditorDrafts() {
    return transaction<DraftLoad>(['drafts'], 'readonly', (tx, result) => {
        const drafts: DraftRecord[] = [], invalid: DraftLoad['invalid'] = [];
        const request = tx.objectStore('drafts').openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) { result({ drafts: drafts.sort((a, b) => b.updatedAt - a.updatedAt), invalid }); return; }
            const record = cursor.value as DraftRecord;
            try {
                if (!record || record.id !== cursor.key || !modules.includes(record.module) || !Number.isFinite(record.updatedAt)) throw new Error('草稿格式错误');
                drafts.push({ ...record, item: normalizeResource(record.module, record.item, '恢复草稿') });
            } catch { invalid.push({ id: String(cursor.key), raw: JSON.stringify(cursor.value) ?? String(cursor.value) }); }
            cursor.continue();
        };
    });
}

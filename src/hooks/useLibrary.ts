import { useEffect, useRef, useState } from 'react';
import type { DB } from '../types';
import { browserStorage, emptyLibraryLoad, loadLibrary, saveLibrary } from '../utils/storage';
import { initializeAuthor, supportsAuthorStorage, writeAuthorRecord } from '../utils/author-store';
import { addTerms, type Terminology, type TermCategory } from '../utils/terminology';

export function useLibrary() {
    const [indexed] = useState(supportsAuthorStorage);
    const [loaded, setLoaded] = useState(() => indexed ? emptyLibraryLoad() : loadLibrary(browserStorage));
    const [ready, setReady] = useState(!indexed);
    const [db, setDb] = useState(loaded.db);
    const [terminology, setTerminology] = useState(loaded.terminology);
    const current = useRef({ db: loaded.db, terminology: loaded.terminology });
    const revision = useRef(0);
    const sequence = useRef(0);
    const writes = useRef<Promise<unknown>>(Promise.resolve());
    const [blocked, setBlocked] = useState(loaded.issues.length > 0);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    const [savedAt, setSavedAt] = useState<number | null>(null);
    useEffect(() => {
        if (!indexed) return;
        let active = true;
        initializeAuthor(browserStorage).then(result => {
            if (!active) return;
            revision.current = result.revision;
            current.current = { db: result.loaded.db, terminology: result.loaded.terminology };
            setLoaded(result.loaded); setDb(result.loaded.db); setTerminology(result.loaded.terminology);
            setBlocked(result.loaded.issues.length > 0); setReady(true);
        }).catch(cause => {
            if (!active) return;
            const message = cause instanceof Error ? cause.message : '作者存档读取失败';
            const fallback = loadLibrary(browserStorage);
            current.current = { db: fallback.db, terminology: fallback.terminology };
            setDb(fallback.db); setTerminology(fallback.terminology);
            setError(message); setBlocked(true); setReady(true);
            setLoaded({ ...fallback, issues: [...fallback.issues, message] });
        });
        return () => { active = false; };
    }, [indexed]);
    const save = (next: DB, nextTerms: Terminology, clearDrafts: string[] = [], allow = false): Promise<boolean> => {
        if (!ready || (blocked && !allow)) {
            setDirty(true); setError('存档未就绪或存在未恢复的数据，已暂停保存。请先处理恢复信息。');
            return Promise.resolve(false);
        }
        const token = ++sequence.current;
        setDirty(true);
        const finish = (ok: boolean, message = '') => {
            if (token === sequence.current) { setDirty(!ok); setError(message); if (ok) setSavedAt(Date.now()); }
            if (ok && allow) setBlocked(false);
            return ok;
        };
        if (!indexed) {
            const result = saveLibrary(browserStorage, next, nextTerms);
            return Promise.resolve(finish(result.ok, result.ok ? '' : result.error));
        }
        const operation = writes.current.then(async () => {
            try {
                const record = await writeAuthorRecord(next, nextTerms, revision.current, clearDrafts);
                revision.current = record.revision; return finish(true);
            } catch (cause) { return finish(false, cause instanceof Error ? cause.message : '保存失败，请导出备份或重试'); }
        });
        writes.current = operation;
        return operation;
    };
    const update = (next: DB, nextTerms = current.current.terminology, clearDrafts: string[] = []) => {
        current.current = { db: next, terminology: nextTerms };
        setDb(next); setTerminology(nextTerms);
        return save(next, nextTerms, clearDrafts);
    };
    const commit = async (next: DB, nextTerms = current.current.terminology, clearDrafts: string[] = []) => {
        if (!await save(next, nextTerms, clearDrafts)) return false;
        current.current = { db: next, terminology: nextTerms };
        setDb(next); setTerminology(nextTerms);
        return true;
    };
    const updateTerminology = (next: Terminology) => { void update(current.current.db, next); };
    const collect = (category: TermCategory, text: string, explicit = false) => {
        const terms = current.current.terminology;
        if (!explicit && !terms.autoCollect) return;
        const next = addTerms(terms, category, text);
        if (next !== terms) updateTerminology(next);
    };
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    return {
        db, terminology, updateTerminology, collect, update, commit, ready, indexed,
        retry: () => save(current.current.db, current.current.terminology),
        allowSave: () => save(current.current.db, current.current.terminology, [], true),
        blocked, dirty, error, savedAt, issues: loaded.issues, recovery: loaded.recovery,
    };
}

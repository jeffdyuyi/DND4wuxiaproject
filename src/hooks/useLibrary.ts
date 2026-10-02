import { useEffect, useRef, useState } from 'react';
import type { DB } from '../types';
import { browserStorage, loadLibrary, saveLibrary } from '../utils/storage';
import { addTerms, type Terminology, type TermCategory } from '../utils/terminology';

export function useLibrary() {
    const [loaded] = useState(() => loadLibrary(browserStorage));
    const [db, setDb] = useState(loaded.db);
    const [terminology, setTerminology] = useState(loaded.terminology);
    const draft = useRef({ db: loaded.db, terminology: loaded.terminology });
    const [blocked, setBlocked] = useState(loaded.issues.length > 0);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    const save = (next: DB, nextTerms = terminology) => {
        if (blocked) { setDirty(true); setError('存在未恢复的数据，已暂停保存。请先导出恢复文件并确认继续。'); return; }
        const result = saveLibrary(browserStorage, next, nextTerms);
        setDirty(!result.ok); setError(result.ok ? '' : result.error);
    };
    const update = (next: DB, nextTerms = draft.current.terminology) => {
        draft.current = { db: next, terminology: nextTerms };
        setDb(next); setTerminology(nextTerms); save(next, nextTerms);
    };
    const updateTerminology = (next: Terminology) => update(draft.current.db, next);
    const collect = (category: TermCategory, text: string, explicit = false) => {
        const current = draft.current.terminology;
        if (!explicit && !current.autoCollect) return;
        const next = addTerms(current, category, text);
        if (next !== current) updateTerminology(next);
    };
    const allowSave = () => {
        const result = saveLibrary(browserStorage, db, terminology);
        if (result.ok) setBlocked(false);
        setDirty(!result.ok); setError(result.ok ? '' : result.error);
    };
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    return { db, terminology, updateTerminology, collect, update, retry: () => save(db), allowSave, blocked, dirty, error, issues: loaded.issues, recovery: loaded.recovery };
}

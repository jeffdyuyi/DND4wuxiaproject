import { useEffect, useState } from 'react';
import type { DB } from '../types';
import { browserStorage, loadLibrary, saveLibrary } from '../utils/storage';

export function useLibrary() {
    const [loaded] = useState(() => loadLibrary(browserStorage));
    const [db, setDb] = useState(loaded.db);
    const [blocked, setBlocked] = useState(loaded.issues.length > 0);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState('');
    const save = (next: DB) => {
        if (blocked) { setDirty(true); setError('存在未恢复的数据，已暂停保存。请先导出恢复文件并确认继续。'); return; }
        const result = saveLibrary(browserStorage, next);
        setDirty(!result.ok); setError(result.ok ? '' : result.error);
    };
    const update = (next: DB) => { setDb(next); save(next); };
    const allowSave = () => {
        const result = saveLibrary(browserStorage, db);
        if (result.ok) setBlocked(false);
        setDirty(!result.ok); setError(result.ok ? '' : result.error);
    };
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    return { db, update, retry: () => save(db), allowSave, blocked, dirty, error, issues: loaded.issues, recovery: loaded.recovery };
}

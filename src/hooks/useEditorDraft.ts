import { useEffect, useRef, useState } from 'react';
import { deleteEditorDrafts, readEditorDrafts, writeEditorDraft, type DraftLoad, type EditorDraft } from '../utils/author-store';

/** Serialize journal writes so an older edit can never reappear after clearing. */
export function useEditorDraft(enabled: boolean) {
    const [id] = useState(() => crypto.randomUUID());
    const [draft, setValue] = useState<EditorDraft | null>(null);
    const current = useRef<EditorDraft | null>(null);
    const pending = useRef<Promise<unknown>>(Promise.resolve());
    const generation = useRef(0);
    const [recoverable, setRecoverable] = useState<DraftLoad>({ drafts: [], invalid: [] });
    const [status, setStatus] = useState('');
    useEffect(() => {
        if (!enabled) return;
        let active = true;
        readEditorDrafts().then(result => { if (active) setRecoverable(result); }).catch(cause => {
            if (active) setStatus(cause instanceof Error ? cause.message : '草稿读取失败');
        });
        return () => { active = false; };
    }, [enabled]);
    const setDraft = (next: EditorDraft | null) => {
        current.current = next; setValue(next);
        if (!enabled) { setStatus(next ? '当前环境无法自动保留草稿，请保存或导出卡片。' : ''); return; }
        const token = ++generation.current;
        setStatus(next ? '正在保留恢复草稿…' : '');
        pending.current = pending.current.then(async () => {
            if (token !== generation.current) return;
            try {
                if (next) await writeEditorDraft(id, next); else await deleteEditorDrafts([id]);
                if (token === generation.current) setStatus(next ? '恢复草稿已保留，尚未覆盖原卡。' : '');
            } catch (cause) {
                if (token === generation.current) setStatus(`${next ? '草稿未保留' : '草稿记录未清理'}：${cause instanceof Error ? cause.message : '请保存或导出卡片'}`);
            }
        });
    };
    const dismiss = async (recordId: string) => {
        try {
            await deleteEditorDrafts([recordId]);
            setRecoverable(previous => ({ drafts: previous.drafts.filter(record => record.id !== recordId), invalid: previous.invalid.filter(record => record.id !== recordId) }));
        } catch (cause) { setStatus(cause instanceof Error ? cause.message : '草稿删除失败'); }
    };
    return { draft, setDraft, current, status, recoverable, dismiss, flush: () => pending.current, ids: [id] };
}

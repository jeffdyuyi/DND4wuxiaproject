import { useState } from 'react';
import { Config } from '../constants';
import { downloadJSON, makeArchive } from '../utils/archive';
import type { DraftLoad, DraftRecord } from '../utils/author-store';
import type { Terminology } from '../utils/terminology';

export function DraftRecoveryPanel({ records, terminology, disabled, onRestore, onDiscard }: {
    records: DraftLoad; terminology: Terminology; disabled: boolean;
    onRestore: (record: DraftRecord) => void; onDiscard: (id: string) => Promise<void>;
}) {
    const [confirmation, setConfirmation] = useState('');
    const count = records.drafts.length + records.invalid.length;
    if (!count) return null;
    return <details className="feedback draft-recovery">
        <summary>发现 {count} 份可恢复草稿</summary>
        <p>恢复为编辑副本，不覆盖原卡。原恢复记录保留，可在确认保存后手动移除。</p>
        {records.drafts.map(record => <div className="draft-recovery-row" key={record.id}>
            <span>{Config[record.module].title} · {record.item.name || '未命名卡片'} · {new Date(record.updatedAt).toLocaleString('zh-CN')}</span>
            <button className="btn" disabled={disabled} onClick={() => onRestore(record)}>恢复编辑</button>
            <button className="btn" onClick={() => downloadJSON(makeArchive({ [record.module]: [record.item] }, terminology), '吾侠_恢复草稿.json')}>导出</button>
            <button className="btn" disabled={disabled} onClick={() => setConfirmation(record.id)}>移除记录</button>
        </div>)}
        {records.invalid.map(record => <div className="draft-recovery-row" key={record.id}>
            <span>无法解析的草稿 · 原始数据仍保留</span>
            <button className="btn" onClick={() => downloadJSON({ raw: record.raw }, '吾侠_草稿恢复原文.json')}>导出原文</button>
            <button className="btn" disabled={disabled} onClick={() => setConfirmation(record.id)}>移除记录</button>
        </div>)}
        {confirmation && <div className="dialog-actions"><span>确认移除此恢复记录？请先保存或导出需要的内容。</span><button className="btn" onClick={() => setConfirmation('')}>取消</button><button className="btn btn-danger" disabled={disabled} onClick={() => { void onDiscard(confirmation); setConfirmation(''); }}>确认移除</button></div>}
    </details>;
}

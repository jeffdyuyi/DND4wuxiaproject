import { useState } from 'react';
import type { DB } from '../types';
import { Config } from '../constants';
import { modules } from '../utils/resources';
import { summarizeImport, type ImportMode } from '../utils/archive';
import { Dialog } from './Dialog';

export function ImportDialog({ db, incoming, onConfirm, onCancel }: {
    db: DB; incoming: Partial<DB>; onConfirm: (mode: ImportMode) => void; onCancel: () => void;
}) {
    const [mode, setMode] = useState<ImportMode>('skip');
    const result = summarizeImport(db, incoming, mode);
    return <Dialog title="导入资源" onCancel={onCancel}>
        <p>文件已通过格式检查。请选择重复条目的处理方式：</p>
        <ul>{modules.filter(module => incoming[module]?.length).map(module => <li key={module}>{Config[module].title}：{incoming[module]?.length} 条</li>)}</ul>
        <label className="form-group">重复 ID 处理
            <select className="form-control" value={mode} onChange={event => setMode(event.target.value as ImportMode)}>
                <option value="skip">跳过重复，保留本地内容</option>
                <option value="overwrite">覆盖重复，使用导入内容</option>
                <option value="copy">全部作为副本，分配新 ID</option>
            </select>
        </label>
        <p role="status">新增 {result.added}，覆盖 {result.replaced}，跳过 {result.skipped}。</p>
        <div className="dialog-actions"><button className="btn" onClick={onCancel}>取消</button><button className="btn btn-primary" onClick={() => onConfirm(mode)}>执行导入</button></div>
    </Dialog>;
}

import { useState } from 'react';
import type { DB } from '../types';
import { Config } from '../constants';
import { modules } from '../utils/resources';
import { summarizeImport, type ImportMode } from '../utils/archive';
import { Dialog } from './Dialog';
import type { Terminology } from '../utils/terminology';

export function ImportDialog({ db, incoming, terminology, onConfirm, onCancel }: {
    db: DB; incoming: Partial<DB>; onConfirm: (mode: ImportMode) => void; onCancel: () => void;
    terminology?: Terminology;
}) {
    const [mode, setMode] = useState<ImportMode>('skip');
    const result = summarizeImport(db, incoming, mode);
    const warnings = [...new Set(modules.flatMap(module => (incoming[module] ?? []).flatMap(item => Array.isArray(item.templateWarnings) ? item.templateWarnings.filter((value): value is string => typeof value === 'string') : [])))];
    return <Dialog title="导入资源" onCancel={onCancel}>
        <p>文件已通过格式检查。请选择重复条目的处理方式：</p>
        <ul>{modules.filter(module => incoming[module]?.length).map(module => <li key={module}>{Config[module].title}：{incoming[module]?.length} 条</li>)}</ul>
        {!!warnings.length && <details className="template-warnings"><summary>4E 转换核对：{warnings.length} 种提示</summary><ul>{warnings.slice(0, 12).map(warning => <li key={warning}>{warning}</li>)}</ul><p>全部提示与原文保留在每张卡的“4E 原版对照”中。</p></details>}
        {terminology && <p>附带 {terminology.entries.length} 个术语：补充本地尚无的词，保留本地已有名称和设置。资源的重复处理选项不会覆盖术语。</p>}
        <label className="form-group">重复 ID 处理
            <select className="form-control" value={mode} onChange={event => setMode(event.target.value as ImportMode)}>
                <option value="skip">不覆盖导入：跳过重复 ID</option>
                <option value="overwrite">覆盖保存：替换重复 ID</option>
                <option value="copy">复制保存：全部分配新 ID</option>
            </select>
        </label>
        <p role="status">新增 {result.added}，覆盖 {result.replaced}，跳过 {result.skipped}。</p>
        <div className="dialog-actions"><button className="btn" onClick={onCancel}>取消</button><button className="btn btn-primary" onClick={() => onConfirm(mode)}>执行导入</button></div>
    </Dialog>;
}

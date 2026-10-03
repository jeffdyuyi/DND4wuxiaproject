import { TermDisplay } from './TermDisplay';
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
        <p><TermDisplay>{"文件已通过格式检查。请选择重复条目的处理方式："}</TermDisplay></p>
        <ul>{modules.filter(module => incoming[module]?.length).map(module => <li key={module}>{<TermDisplay>{Config[module].title}</TermDisplay>}<TermDisplay>{"："}</TermDisplay>{<TermDisplay>{incoming[module]?.length}</TermDisplay>}<TermDisplay>{" 条"}</TermDisplay></li>)}</ul>
        {!!warnings.length && <details className="template-warnings"><summary><TermDisplay>{"4E 转换核对："}</TermDisplay>{<TermDisplay>{warnings.length}</TermDisplay>}<TermDisplay>{" 种提示"}</TermDisplay></summary><ul>{warnings.slice(0, 12).map(warning => <li key={warning}>{<TermDisplay>{warning}</TermDisplay>}</li>)}</ul><p><TermDisplay>{"全部提示与原文保留在每张卡的“4E 原版对照”中。"}</TermDisplay></p></details>}
        {terminology && <p><TermDisplay>{"附带 "}</TermDisplay>{<TermDisplay>{terminology.entries.length}</TermDisplay>}<TermDisplay>{" 个术语：补充本地尚无的词，保留本地已有名称和设置。资源的重复处理选项不会覆盖术语。"}</TermDisplay></p>}
        <label className="form-group"><TermDisplay>{"重复 ID 处理"}</TermDisplay><select className="form-control" value={mode} onChange={event => setMode(event.target.value as ImportMode)}>
                <option value="skip"><TermDisplay>{"不覆盖导入：跳过重复 ID"}</TermDisplay></option>
                <option value="overwrite"><TermDisplay>{"覆盖保存：替换重复 ID"}</TermDisplay></option>
                <option value="copy"><TermDisplay>{"复制保存：全部分配新 ID"}</TermDisplay></option>
            </select>
        </label>
        <p role="status"><TermDisplay>{"新增 "}</TermDisplay>{<TermDisplay>{result.added}</TermDisplay>}<TermDisplay>{"，覆盖 "}</TermDisplay>{<TermDisplay>{result.replaced}</TermDisplay>}<TermDisplay>{"，跳过 "}</TermDisplay>{<TermDisplay>{result.skipped}</TermDisplay>}<TermDisplay>{"。"}</TermDisplay></p>
        <div className="dialog-actions"><button className="btn" onClick={onCancel}><TermDisplay>{"取消"}</TermDisplay></button><button className="btn btn-primary" onClick={() => onConfirm(mode)}><TermDisplay>{"执行导入"}</TermDisplay></button></div>
    </Dialog>;
}

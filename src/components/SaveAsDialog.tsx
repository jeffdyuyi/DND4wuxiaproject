import { TermDisplay } from './TermDisplay';
import { useState } from 'react';
import { Dialog } from './Dialog';
export function SaveAsDialog({ name, onSave, onClose }: { name: string; onSave: (name: string) => void; onClose: () => void }) {
    const [value, setValue] = useState(`${name || '未命名卡片'}（另存）`);
    return <Dialog title="另存为" onCancel={onClose}><p><TermDisplay>{"保存一张独立的新卡片，保留原卡。"}</TermDisplay></p><label><TermDisplay>{"新卡名称"}</TermDisplay><input autoFocus className="form-control" value={value} onChange={event => setValue(event.target.value)} /></label><div className="dialog-actions"><button className="btn" onClick={onClose}><TermDisplay>{"取消"}</TermDisplay></button><button className="btn btn-primary" disabled={!value.trim()} onClick={() => onSave(value.trim())}><TermDisplay>{"另存新卡"}</TermDisplay></button></div></Dialog>;
}

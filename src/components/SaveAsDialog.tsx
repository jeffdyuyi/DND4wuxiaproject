import { useState } from 'react';
import { Dialog } from './Dialog';
export function SaveAsDialog({ name, onSave, onClose }: { name: string; onSave: (name: string) => void; onClose: () => void }) {
    const [value, setValue] = useState(`${name || '未命名卡片'}（另存）`);
    return <Dialog title="不覆盖另存" onCancel={onClose}><p>使用新 ID 保存独立卡片，原卡内容保持不变。</p><label>新卡名称<input autoFocus className="form-control" value={value} onChange={event => setValue(event.target.value)} /></label><div className="dialog-actions"><button className="btn" onClick={onClose}>取消</button><button className="btn btn-primary" disabled={!value.trim()} onClick={() => onSave(value.trim())}>另存新卡</button></div></Dialog>;
}

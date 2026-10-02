import { Dialog } from './Dialog';
interface ConfirmModalProps { message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; }
export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = '确认删除' }: ConfirmModalProps) {
    return <Dialog title="确认操作" onCancel={onCancel}>
        <p>{message}</p>
        <div className="dialog-actions"><button className="btn" onClick={onCancel}>取消</button><button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button></div>
    </Dialog>;
}

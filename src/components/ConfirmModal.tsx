import { TermDisplay } from './TermDisplay';
import { Dialog } from './Dialog';
interface ConfirmModalProps { message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string; }
export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = '确认删除' }: ConfirmModalProps) {
    return <Dialog title="确认操作" onCancel={onCancel}>
        <p>{<TermDisplay>{message}</TermDisplay>}</p>
        <div className="dialog-actions"><button className="btn" onClick={onCancel}><TermDisplay>{"取消"}</TermDisplay></button><button className="btn btn-danger" onClick={onConfirm}>{<TermDisplay>{confirmLabel}</TermDisplay>}</button></div>
    </Dialog>;
}

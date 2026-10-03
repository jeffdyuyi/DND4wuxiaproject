import { TermDisplay } from './TermDisplay';

interface SaveState { blocked: boolean; dirty: boolean; error: string; savedAt: number | null; }
export function SaveStatus({ state, draft, saving }: { state: SaveState; draft: boolean; saving: boolean }) {
    const text = state.blocked ? '保存已暂停'
        : state.error ? '保存失败，请重试'
        : saving ? '正在保存…'
        : draft ? '修改尚未提交'
        : state.dirty ? '等待保存'
        : state.savedAt ? `已保存到本地 · ${new Date(state.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
        : '本地数据就绪';
    return <span role="status" className={state.blocked || state.dirty || draft ? 'save-status save-warning' : 'save-status'}><TermDisplay>{text}</TermDisplay></span>;
}

import { Dialog } from './Dialog';

export function DisclaimerModal({ onClose }: { onClose: () => void }) {
    return <Dialog title="欢迎使用 吾侠" onCancel={onClose}>
        <div className="welcome-content">
            <p>本工具由 <strong>不咕鸟（基德）</strong> 开发。</p>
            <p className="welcome-note">内容基于 DND4E 玩家手册中文排版样式，<br />并辅以 AI 技术制作。</p>
            <p><strong>组织：</strong>成都秘密基地TRPG跑团群<br /><strong>691707475</strong></p>
            <p className="welcome-disclaimer">⚠️ 免责声明：<br />本工具仅供个人学习和娱乐使用，严禁商业用途。</p>
        </div>
        <div className="dialog-actions"><button type="button" className="btn btn-primary" onClick={onClose}>我已了解，进入江湖</button></div>
    </Dialog>;
}

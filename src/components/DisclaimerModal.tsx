import { Dialog } from './Dialog';

export function DisclaimerModal({ onClose }: { onClose: () => void }) {
    return <Dialog title="吾侠 · 作者信息" onCancel={onClose}>
        <div className="welcome-content">
            <p>本工具由 <strong>不咕鸟（基德）</strong> 开发。</p>
            <p><strong>作者信息：</strong>不咕鸟（哈基米德）<br /><strong>辅助 AI：</strong>Antigravity Gemini / Codex GPT</p>
            <p className="welcome-note">内容基于 DND4E 玩家手册中文排版样式，<br />并辅以 AI 技术制作。</p>
            <p><strong>组织：</strong>成都秘密基地TRPG跑团群<br /><strong>691707475</strong></p>
            <p>欢迎直接联系或者加群讨论模组、规则以及造轮子、修BUG。</p>
            <dl className="author-contacts">
                <dt>不咕鸟创作交流群</dt><dd>261751459</dd>
                <dt>成都秘密基地TRPG俱乐部群</dt><dd>691707475</dd>
                <dt>成都秘密基地TRPG俱乐部网址</dt><dd><a href="https://nogubird.top" target="_blank" rel="noopener noreferrer">nogubird.top</a></dd>
                <dt>为作者加油</dt><dd><a href="https://ifdian.net/a/nogubird" target="_blank" rel="noopener noreferrer">支持不咕鸟</a></dd>
            </dl>
            <p className="welcome-disclaimer">⚠️ 免责声明：<br />本工具仅供个人学习和娱乐使用，严禁商业用途。</p>
        </div>
        <div className="dialog-actions"><button type="button" className="btn btn-primary" onClick={onClose}>我已了解，进入江湖</button></div>
    </Dialog>;
}

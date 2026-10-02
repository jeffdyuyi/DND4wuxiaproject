import { useState } from 'react';
import { Dialog } from './Dialog';
import { useTerminology } from '../hooks/TerminologyContext';
import { addTerms, TermCategories, type TermCategory, validateTerminology } from '../utils/terminology';
import { downloadJSON, makeArchive } from '../utils/archive';

export function TerminologyDialog({ onClose }: { onClose: () => void }) {
    const { terminology, update } = useTerminology();
    const [category, setCategory] = useState<TermCategory>('damage');
    const [query, setQuery] = useState('');
    const [newWord, setNewWord] = useState('');
    const [error, setError] = useState('');
    const entries = terminology.entries.filter(term => term.category === category &&
        `${term.label} ${term.reference ?? ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    const rename = (id: string, label: string) => {
        try { update(validateTerminology({ ...terminology, entries: terminology.entries.map(term => term.id === id ? { ...term, label } : term) })); setError(''); }
        catch (error) { setError(error instanceof Error ? error.message : '名称无效'); }
    };
    return <Dialog title="分类术语库" onCancel={onClose}>
        <p className="progression-hint">修改只影响以后选词，已有卡片文字保持不变。原版参考不代表规则等价；隐藏词仍保留在词库。</p>
        <label><input type="checkbox" checked={terminology.autoCollect} onChange={event => update({ ...terminology, autoCollect: event.target.checked })} /> 自动收录已确认的新词</label>
        <div className="row term-toolbar">
            <label className="col">分类<select className="form-control" value={category} onChange={event => { setCategory(event.target.value as TermCategory); setError(''); }}>
                {Object.entries(TermCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select></label>
            <label className="col">搜索<input className="form-control" value={query} onChange={event => setQuery(event.target.value)} /></label>
        </div>
        {category !== 'usage' && <form className="row" onSubmit={event => { event.preventDefault(); update(addTerms(terminology, category, newWord)); setNewWord(''); }}>
            <input aria-label="新增术语" className="form-control" placeholder="新词，多个词用逗号分隔" value={newWord} onChange={event => setNewWord(event.target.value)} />
            <button type="submit" className="btn" disabled={!newWord.trim()}>添加</button>
        </form>}
        <p className="progression-hint">{entries.length} 个术语 · 名称编辑后按回车或离开输入框保存</p>
        {error && <p role="alert" className="feedback-error">{error}</p>}
        <div className="term-list">
            {entries.map(term => <div className={`term-entry ${term.hidden ? 'term-hidden' : ''}`} key={`${term.id}:${term.label}`}>
                <input aria-label={`名称：${term.label}`} className="form-control" defaultValue={term.label} onBlur={event => { if (event.target.value !== term.label) rename(term.id, event.target.value); }}
                    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
                <small title={term.source}>{term.origin === 'custom' ? '自定义' : term.origin === '4e' ? '4E 参考' : '原有武侠词'}{term.reference && ` · 参考：${term.reference}`}</small>
                {term.origin === 'custom' && <select className="form-control term-reference" aria-label={`${term.label}的原版参考`} value={term.reference ?? ''} onChange={event => update({ ...terminology, entries: terminology.entries.map(current => current.id === term.id ? { ...current, reference: event.target.value } : current) })}>
                    <option value="">不对应原版词</option>
                    {term.reference && !terminology.entries.some(current => current.origin !== 'custom' && current.category === category && (current.reference || current.label) === term.reference) && <option value={term.reference}>{term.reference}</option>}
                    {[...new Set(terminology.entries.filter(current => current.origin !== 'custom' && current.category === category).map(current => current.reference || current.label))].map(word => <option key={word} value={word}>{word}</option>)}
                </select>}
                <button type="button" className="btn" onClick={() => update({ ...terminology, entries: terminology.entries.map(current => current.id === term.id ? { ...current, hidden: !current.hidden } : current) })}>{term.hidden ? '显示' : '隐藏'}</button>
            </div>)}
            {!entries.length && <p className="empty-state">此分类暂无匹配术语，可以添加自己的名称。</p>}
        </div>
        <div className="dialog-actions"><button className="btn" onClick={() => downloadJSON(makeArchive({}, terminology), '吾侠_术语库.json')}>导出术语库</button><button className="btn btn-primary" onClick={onClose}>完成</button></div>
    </Dialog>;
}

import { useState } from 'react';
import { Dialog } from './Dialog';
import { useTerminology } from '../hooks/TerminologyContext';
import { addTerms, TermCategories, type TermCategory, validateTerminology } from '../utils/terminology';
import { setReplacement, termName } from '../utils/term-display';
import { downloadJSON, makeArchive, readLibraryArchive } from '../utils/archive';

export function TerminologyDialog({ onClose }: { onClose: () => void }) {
    const { terminology, update } = useTerminology();
    const [category, setCategory] = useState<TermCategory>('damage');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [newWord, setNewWord] = useState('');
    const [error, setError] = useState('');
    const entries = terminology.entries.filter(term => term.category === category &&
        `${term.original || term.value} ${termName(term)} ${term.description || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
        (filter === 'all' || (filter === 'mapped' && !!term.replacement) || (filter === 'unmapped' && !term.replacement) || (filter === 'custom' && term.origin === 'custom') || (filter === 'hidden' && term.hidden)));
    const rename = (id: string, replacement: string) => {
        try { update(validateTerminology(setReplacement(terminology, id, replacement))); setError(''); }
        catch (error) { setError(error instanceof Error ? error.message : '名称无效'); }
    };
    return <Dialog title="关键词与术语置换工具" className="terminology-workbench" onCancel={onClose}>
        <p className="progression-hint">置换全局影响界面、选词和已有卡片显示；留空恢复 4E 标准名称。原版参考和存档正文保留。隐藏只影响选词，不关闭置换。</p>
        <label><input type="checkbox" checked={terminology.autoCollect} onChange={event => update({ ...terminology, autoCollect: event.target.checked })} /> 自动收录已确认的新词</label>
        <div className="row term-toolbar">
            <label className="col">分类<select className="form-control" value={category} onChange={event => { setCategory(event.target.value as TermCategory); setError(''); }}>
                {Object.entries(TermCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select></label>
            <label className="col">搜索<input className="form-control" placeholder="标准名称、置换名称或释义" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <label>状态<select className="form-control" value={filter} onChange={event => setFilter(event.target.value)}>
                <option value="all">全部</option><option value="mapped">已置换</option><option value="unmapped">未置换</option><option value="custom">自定义</option><option value="hidden">已隐藏</option>
            </select></label>
        </div>
        {category !== 'usage' && <form className="row" onSubmit={event => { event.preventDefault(); update(addTerms(terminology, category, newWord)); setNewWord(''); }}>
            <input aria-label="新增术语" className="form-control" placeholder="新增自定义词，多个词用逗号分隔" value={newWord} onChange={event => setNewWord(event.target.value)} />
            <button type="submit" className="btn" disabled={!newWord.trim()}>添加</button>
        </form>}
        <p className="progression-hint">{entries.length} 个术语 · 编辑后按回车或离开输入框保存 · 原版词的置换直接填写在对应行</p>
        {error && <p role="alert" className="feedback-error">{error}</p>}
        <div className="term-list">
            {entries.map(term => <section className={`term-entry ${term.hidden ? 'term-hidden' : ''}`} key={`${term.id}:${term.replacement}`}>
                <div className="term-original"><strong>{term.original || term.value}</strong><small>{term.origin === 'custom' ? '自定义词' : term.origin === 'wuxia' ? '原有武侠词' : '4E 标准词'} · 显示：{termName(term)}</small></div>
                <label>置换名称<input aria-label={`置换：${term.original || term.value}`} className="form-control" placeholder={term.original || term.value} defaultValue={term.replacement || ''} onBlur={event => { if (event.target.value !== (term.replacement || '')) rename(term.id, event.target.value); }}
                    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} /></label>
                <div className="term-row-actions"><button type="button" className="btn" disabled={!term.replacement} onClick={() => rename(term.id, '')}>恢复原称呼</button>
                    <button type="button" className="btn" onClick={() => update({ ...terminology, entries: terminology.entries.map(current => current.id === term.id ? { ...current, hidden: !current.hidden } : current) })}>{term.hidden ? '恢复选词' : '隐藏选词'}</button></div>
                {(term.description || term.source) && <details className="term-definition"><summary>释义与来源</summary><p>{term.description || '工具标准字段，无独立释义。'}</p><small>{term.source}</small></details>}
            </section>)}
            {!entries.length && <p className="empty-state">此分类暂无匹配术语。</p>}
        </div>
        <div className="dialog-actions"><label className="btn import-button">合并导入术语库<input type="file" accept=".json" onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
            try { if (file.size > 5 * 1024 * 1024) throw new Error('术语文件超过 5 MB'); const parsed = JSON.parse(await file.text()); const incoming = parsed.entries ? validateTerminology(parsed) : readLibraryArchive(parsed).terminology; if (!incoming) throw new Error('文件没有术语库'); const absorbed = new Set(incoming.entries.filter(term => term.origin === '4e' && term.replacement).map(term => `${term.category}:${term.replacement}`)); const entries = terminology.entries.filter(term => !(term.origin === 'wuxia' && absorbed.has(`${term.category}:${termName(term)}`))); for (const term of incoming.entries) { const index = entries.findIndex(current => current.id === term.id || (current.category === term.category && current.value === term.value)); if (index < 0) entries.push(term); else entries[index] = { ...term, id: entries[index].id, aliases: [...new Set([...(entries[index].aliases || []), ...(term.aliases || [])])] }; } update(validateTerminology({ ...terminology, entries })); setError(''); } catch (error) { setError(error instanceof Error ? error.message : '导入失败'); }
        }} /></label><button className="btn" onClick={() => downloadJSON(makeArchive({}, terminology), '吾侠_术语库.json')}>导出术语库</button><button className="btn btn-primary" onClick={onClose}>完成</button></div>
    </Dialog>;
}

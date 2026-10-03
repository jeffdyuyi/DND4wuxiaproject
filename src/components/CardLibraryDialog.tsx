import { useMemo, useState } from 'react';
import { Dialog } from './Dialog';
import { Config, type ModuleType } from '../constants';
import type { DB, Item } from '../types';
import { modules, resourceSearchText } from '../utils/resources';
import { downloadJSON, makeArchive } from '../utils/archive';
export function CardLibraryDialog({ db, busy, status, onBundle, onClose }: { db: DB; busy: boolean; status: string; onBundle: (entries: { module: ModuleType; item: Item }[], images: boolean) => void; onClose: () => void }) {
    const [query, setQuery] = useState(''); const [category, setCategory] = useState(''); const [selected, setSelected] = useState<string[]>([]);
    const [page, setPage] = useState(0);
    const entries = useMemo(() => modules.flatMap(module => db[module].map(item => ({ module, item, key: `${module}:${item.id}` }))), [db]);
    const visible = entries.filter(entry => (!category || entry.module === category) && resourceSearchText(entry.item).includes(query.trim().toLocaleLowerCase()));
    const chosen = entries.filter(entry => selected.includes(entry.key));
    const exportJSON = () => {
        const data: Partial<DB> = Object.fromEntries(modules.map(module => [module, chosen.filter(entry => entry.module === module).map(entry => entry.item)]));
        downloadJSON(makeArchive(data), '吾侠_选中卡牌.json');
    };
    return <Dialog title="卡牌库 · 多选与打包" onCancel={onClose} className="card-library-dialog"><div className="row"><input className="form-control col" placeholder="搜索名称与规则正文…" aria-label="搜索卡牌库" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /><select className="form-control" aria-label="卡牌类别" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}><option value="">全部类目</option>{modules.map(module => <option key={module} value={module}>{Config[module].title}</option>)}</select></div>
        <div className="toolbar"><span>选中 {chosen.length} / 共 {entries.length} 张</span><button className="btn" disabled={busy} onClick={() => setSelected([...new Set([...selected, ...visible.map(entry => entry.key)])])}>选择搜索结果</button><button className="btn" disabled={busy} onClick={() => setSelected([])}>清空选择</button></div>
        <div className="card-library-list">{visible.slice(page * 60, (page + 1) * 60).map(entry => <label key={entry.key} className="card-library-row"><input type="checkbox" disabled={busy} checked={selected.includes(entry.key)} onChange={event => setSelected(event.target.checked ? [...selected, entry.key] : selected.filter(key => key !== entry.key))} /><strong>{entry.item.name || '未命名'}</strong><small>{Config[entry.module].title}</small></label>)}{!visible.length && <p className="empty-state">暂无匹配卡片。</p>}</div>
        <div className="toolbar"><button className="btn" disabled={!page || busy} onClick={() => setPage(value => value - 1)}>上一页</button><span>{page + 1} / {Math.max(1, Math.ceil(visible.length / 60))}</span><button className="btn" disabled={(page + 1) * 60 >= visible.length || busy} onClick={() => setPage(value => value + 1)}>下一页</button></div>
        {status && <p role="status">{status}</p>}<div className="dialog-actions"><button className="btn" onClick={onClose}>关闭</button><button className="btn" disabled={!chosen.length || busy} onClick={exportJSON}>合并 JSON</button><button className="btn" disabled={!chosen.length || busy} onClick={() => onBundle(chosen, false)}>单卡 JSON 打包</button><button className="btn btn-primary" disabled={!chosen.length || busy} onClick={() => onBundle(chosen, true)}>PNG＋JSON 打包</button></div></Dialog>;
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Config, type ModuleType } from '../constants';
import { adaptTemplate, originalBody, TemplateCategories, TemplateModules, type OriginalEntry, type TemplateDraft, type TemplateIndex, type TemplateSummary } from '../utils/templates';
import { cachedToolPack, templatesForTool } from '../utils/tool-templates';
import { type PackInfo } from '../utils/template-cache';
import { importTemplatePack, loadTemplate } from '../utils/template-loader';
import { ResourceManagerPanel } from './ResourceManagerPanel';

export default function TemplatesDialog({ currentModule, authorBytes, onCopy, onClose, mode = 'manager', onManage }: { mode?: 'manager' | 'picker'; onManage?: () => void; currentModule: ModuleType; authorBytes: number; onCopy: (drafts: TemplateDraft[]) => void; onClose: () => void }) {
    const picker = mode === 'picker';
    const [packs, setPacks] = useState<PackInfo[]>([]);
    const [packId, setPackId] = useState('');
    const base = import.meta.env.BASE_URL;
    const [index, setIndex] = useState<TemplateIndex | null>(null);
    const [category, setCategory] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<TemplateSummary | null>(null);
    const [detail, setDetail] = useState<{ original: OriginalEntry; powers: Map<string, OriginalEntry> } | null>(null);
    const [target, setTarget] = useState<ModuleType>(currentModule);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const request = useRef<AbortController | null>(null);
    const activateIndex = useCallback((value: TemplateIndex | null) => {
        request.current?.abort();
        setIndex(value); setSelected(null); setDetail(null); setPage(0); setLoading(false); setError('');
    }, []);
    useEffect(() => () => request.current?.abort(), []);
    const openPack = useCallback(async (id?: string) => {
        request.current?.abort();
        const controller = new AbortController(); request.current = controller;
        setIndex(null); setSelected(null); setDetail(null); setPage(0); setLoading(true); setError('');
        try {
            const cached = await cachedToolPack(id);
            if (controller.signal.aborted) return;
            setPacks(cached.packs); setPackId(cached.selected?.id ?? '');
            setIndex(cached.pack ? importTemplatePack(cached.pack) : null);
        } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '本地资料读取失败'); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    }, []);
    useEffect(() => { if (picker) void openPack(); }, [picker, openPack]);
    const results = useMemo(() => {
        const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return (picker ? templatesForTool(index?.entries ?? [], currentModule) : index?.entries)?.filter(entry => (!category || entry.category === category) && words.every(word => `${entry.name} ${entry.nameEn} ${entry.source} ${entry.level} ${entry.keywords}`.toLocaleLowerCase().includes(word) || entry.searchText?.includes(word))) ?? [];
    }, [index, query, category, picker, currentModule]);
    const drafts = useMemo(() => detail && index ? adaptTemplate(detail.original, target, index.sourceVersion, detail.powers) : [], [detail, target, index]);
    const choose = async (summary: TemplateSummary) => {
        if (!index) return;
        request.current?.abort(); const controller = new AbortController(); request.current = controller;
        setSelected(summary); setDetail(null); setLoading(true); setError('');
        setTarget(TemplateModules[summary.category].includes(currentModule) ? currentModule : TemplateModules[summary.category][0]);
        try { const value = await loadTemplate(base, summary, index, controller.signal); if (!controller.signal.aborted) setDetail(value); }
        catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '模板加载失败'); }
        finally { if (!controller.signal.aborted) setLoading(false); }
    };
    return <Dialog title={picker ? `导入 4E 模板 · ${Config[currentModule].title}` : "资源管理"} onCancel={onClose} className="template-dialog">
        <p className="progression-hint">{picker && <>从已下载资料中选择适用于当前工具的模板。导入后可直接编辑。 </>}查看原版资料，复制为自己的资源后再修改。原版不随草稿编辑改变；转换提示请在复制前核对。</p>
        <div className={picker ? "template-picker-grid" : "resource-manager-grid"}>
        {!picker && <ResourceManagerPanel onActivate={activateIndex} authorBytes={authorBytes} />}
        <section className="resource-search-panel manager-card" aria-label="资源搜索">
        <div className="manager-heading"><h3>⌕ 资源搜索</h3><small>当前包 {index?.entries.length ?? 0} 条</small></div>
        <div className="row template-filters">
            {picker && <label>已下载资料包<select className="form-control" value={packId} onChange={event => void openPack(event.target.value)} disabled={!packs.length}>
                {!packs.length && <option value="">尚无已下载资料</option>}{packs.map(pack => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count} 条</option>)}
            </select></label>}
            {!picker && <label>类别<select className="form-control" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>
                <option value="">全部类别</option>{Object.entries(TemplateCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select></label>}
            <label className="col">搜索<input type="search" className="form-control" placeholder="搜索名称、关键词、出处与正文；空格分隔条件" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
        </div>
        {!index && !loading && <div className="empty-state">{picker ? '尚未读取到已下载资料，请先在资源管理中下载资料包。' : '加载或选择左侧资料包后，即可检索原版模板。'}{picker && <button className="btn" onClick={onManage}>打开资源管理</button>}</div>}
        {picker && loading && !index && <p role="status">正在读取已下载资料…</p>}
        {picker && <p className="progression-hint">仅显示{Config[currentModule].title}对应的 4E 原版资料。<button className="btn" onClick={onManage}>管理资料包</button></p>}
        {error && <div role="alert" className="feedback feedback-error">{error}{picker && !index && <button className="btn" onClick={() => void openPack(packId || undefined)}>重试读取</button>}{selected && index && <button className="btn" onClick={() => void choose(selected)}>重试</button>}</div>}
        {index && <div className="template-layout">
            <section className="template-results" aria-label="原版模板列表">
                <p role="status">找到 {results.length} 条 · 共 {index.entries.length} 条</p>
                {results.slice(page * 40, (page + 1) * 40).map(entry => <button type="button" className={`template-result ${selected?.id === entry.id && selected.category === entry.category ? 'active' : ''}`} key={`${entry.category}:${entry.id}`} onClick={() => void choose(entry)}>
                    <strong>{entry.name}</strong><small>{TemplateCategories[entry.category]} · {entry.source} {entry.level && `· ${entry.level}级`}</small>
                </button>)}
                {!results.length && <p className="empty-state">{index.entries.length ? '没有匹配模板。' : '请先导入资料包，再检索并复制模板。'}</p>}
                <div className="toolbar"><button className="btn" disabled={page === 0} onClick={() => setPage(value => value - 1)}>上一页</button><span>{page + 1} / {Math.max(1, Math.ceil(results.length / 40))}</span><button className="btn" disabled={(page + 1) * 40 >= results.length} onClick={() => setPage(value => value + 1)}>下一页</button></div>
            </section>
            <section className="template-detail" aria-label="原版模板详情">
                {loading && <p role="status">正在加载正文及附属威能…</p>}
                {!selected && <p className="empty-state">选择左侧模板查看。</p>}
                {detail && <>
                    <h3>{detail.original.name}</h3><p>{detail.original.nameEn} · {detail.original.source}</p>
                    {!picker && <label>复制为<select className="form-control" value={target} onChange={event => setTarget(event.target.value as ModuleType)}>{TemplateModules[detail.original.category].map(module => <option key={module} value={module}>{Config[module].title}</option>)}</select></label>}
                    {!!drafts.flatMap(draft => draft.warnings).length && <div className="template-warnings"><strong>转换核对</strong><ul>{[...new Set(drafts.flatMap(draft => draft.warnings))].map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
                    <p className="progression-hint">将创建 {drafts.length} 条独立草稿，保留来源与原始字段。不会覆盖已有资源。</p>
                    <button className="btn btn-primary" disabled={!drafts.length || loading} onClick={() => onCopy(drafts)}>{picker ? "导入到" : "复制为"}{Config[target].title}{!picker && "草稿"}</button>
                    <h4>原版正文</h4><pre className="template-body">{originalBody(detail.original)}</pre>
                    <details><summary>原始字段与引用</summary><pre className="template-body">{JSON.stringify(detail.original, null, 2)}</pre></details>
                </>}
            </section>
        </div>}
        </section>
        </div>
        <div className="dialog-actions"><button className="btn" onClick={onClose}>关闭</button></div>
    </Dialog>;
}

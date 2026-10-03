import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Config, type ModuleType } from '../constants';
import { adaptTemplate, originalBody, TemplateCategories, TemplateModules, type OriginalEntry, type TemplateDraft, type TemplateIndex, type TemplateSummary } from '../utils/templates';
import { importTemplatePack, loadTemplate, loadTemplateIndex } from '../utils/template-loader';

export default function TemplatesDialog({ currentModule, onCopy, onClose }: { currentModule: ModuleType; onCopy: (drafts: TemplateDraft[]) => void; onClose: () => void }) {
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
    const [retry, setRetry] = useState(0);
    const request = useRef<AbortController | null>(null);
    const importRevision = useRef(0);
    const importPack = async (file?: File) => {
        if (!file) return;
        request.current?.abort();
        try {
            if (file.size > 100 * 1024 * 1024) throw new Error('资料包超过 100 MB，请拆分后导入');
            const value = importTemplatePack(JSON.parse(await file.text()));
            importRevision.current += 1;
            setIndex(value); setSelected(null); setDetail(null); setPage(0); setLoading(false); setError('');
        } catch (error) { setError(error instanceof Error ? error.message : '资料包读取失败'); }
    };
    useEffect(() => {
        const controller = new AbortController();
        const revision = importRevision.current;
        loadTemplateIndex(base, controller.signal).then(value => { if (!controller.signal.aborted && revision === importRevision.current) { setIndex(value); setError(''); } })
            .catch(error => { if (!controller.signal.aborted && revision === importRevision.current) setError(error instanceof Error ? error.message : '模板加载失败'); });
        return () => { controller.abort(); request.current?.abort(); };
    }, [base, retry]);
    const results = useMemo(() => {
        const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
        return index?.entries.filter(entry => (!category || entry.category === category) && words.every(word => `${entry.name} ${entry.nameEn} ${entry.source} ${entry.level} ${entry.keywords}`.toLocaleLowerCase().includes(word))) ?? [];
    }, [index, query, category]);
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
    return <Dialog title="4E 原版只读模板" onCancel={onClose} className="template-dialog">
        <p className="progression-hint">查看原版资料，复制为自己的资源后再修改。原版不随草稿编辑改变；转换提示请在复制前核对。</p>
        <label className="form-label">导入 4E NEXT 资料包<input type="file" accept=".json,application/json" onChange={event => { void importPack(event.target.files?.[0]); event.target.value = ''; }} /></label>
        <p className="progression-hint">资料包仅在当前页面内读取，不上传服务器。刷新后需要重新导入；已复制的草稿按现有方式保存。</p>
        <div className="row template-filters">
            <label>类别<select className="form-control" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>
                <option value="">全部类别</option>{Object.entries(TemplateCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}
            </select></label>
            <label className="col">搜索<input type="search" className="form-control" placeholder="中英文名称、关键词、等级或出处；空格分隔条件" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
        </div>
        {!index && !error && <p role="status">正在加载模板索引…</p>}
        {error && <div role="alert" className="feedback feedback-error">{error}<button className="btn" onClick={() => selected && index ? void choose(selected) : setRetry(value => value + 1)}>重试</button></div>}
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
                    <label>复制为<select className="form-control" value={target} onChange={event => setTarget(event.target.value as ModuleType)}>{TemplateModules[detail.original.category].map(module => <option key={module} value={module}>{Config[module].title}</option>)}</select></label>
                    {!!drafts.flatMap(draft => draft.warnings).length && <div className="template-warnings"><strong>转换核对</strong><ul>{[...new Set(drafts.flatMap(draft => draft.warnings))].map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
                    <p className="progression-hint">将创建 {drafts.length} 条独立草稿，保留来源与原始字段。不会覆盖已有资源。</p>
                    <button className="btn btn-primary" onClick={() => onCopy(drafts)}>复制为{Config[target].title}草稿</button>
                    <h4>原版正文</h4><pre className="template-body">{originalBody(detail.original)}</pre>
                    <details><summary>原始字段与引用</summary><pre className="template-body">{JSON.stringify(detail.original, null, 2)}</pre></details>
                </>}
            </section>
        </div>}
        <div className="dialog-actions"><button className="btn" onClick={onClose}>关闭</button></div>
    </Dialog>;
}

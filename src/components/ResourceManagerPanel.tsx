import { useEffect, useRef, useState } from 'react';
import { clearTemplatePack, importTemplatePack, type TemplatePack } from '../utils/template-loader';
import type { TemplateIndex } from '../utils/templates';
import { deletePack, formatBytes, listPacks, readPack, readSetting, savePack, writeSetting, type PackInfo } from '../utils/template-cache';
import { downloadRemotePack, REMOTE_SOURCE } from '../utils/template-remote';
import { downloadJSON } from '../utils/archive';

export function ResourceManagerPanel({ onActivate, authorBytes }: { onActivate: (index: TemplateIndex | null) => void; authorBytes: number }) {
    const [packs, setPacks] = useState<PackInfo[]>([]);
    const [active, setActive] = useState('');
    const [busy, setBusy] = useState(true);
    const [progress, setProgress] = useState('正在读取本地资料…');
    const [error, setError] = useState('');
    const [estimate, setEstimate] = useState<StorageEstimate | null>(null);
    const [persistent, setPersistent] = useState<boolean | null>(null);
    const [pendingDelete, setPendingDelete] = useState('');
    const mounted = useRef(false);
    const operation = useRef<AbortController | null>(null);
    const lock = useRef(true);
    const refreshStorage = async () => {
        const [usage, retained] = await Promise.allSettled([navigator.storage?.estimate(), navigator.storage?.persisted()]);
        if (mounted.current) {
            setEstimate(usage.status === 'fulfilled' ? usage.value ?? null : null);
            setPersistent(retained.status === 'fulfilled' ? retained.value ?? null : null);
        }
    };
    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        const restore = async () => {
            try {
                const items = await listPacks(); const saved = await readSetting<string>('active');
                const id = items.some(item => item.id === saved) ? saved! : items[0]?.id;
                const pack = id ? await readPack(id) : undefined;
                if (!controller.signal.aborted) {
                    setPacks(items); setActive(pack ? id! : ''); onActivate(pack ? importTemplatePack(pack) : null);
                    if (id && !pack) setError('资料包正文缺失，请重新导入或获取。');
                }
            } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '缓存读取失败'); }
            finally { if (!controller.signal.aborted) { lock.current = false; setBusy(false); setProgress(''); void refreshStorage(); } }
        };
        void restore();
        return () => { mounted.current = false; controller.abort(); operation.current?.abort(); };
    }, [onActivate]);
    const run = async (task: (signal: AbortSignal) => Promise<void>) => {
        if (lock.current) return;
        lock.current = true; const controller = new AbortController(); operation.current = controller;
        setBusy(true); setError('');
        try { await task(controller.signal); }
        catch (error) { if (mounted.current) setError(controller.signal.aborted ? '已取消，已有资料未改变。' : error instanceof Error ? error.message : '操作失败，请重试'); }
        finally { lock.current = false; if (mounted.current) { setBusy(false); setProgress(''); void refreshStorage(); } }
    };
    const activate = async (id: string, signal: AbortSignal) => {
        const pack = await readPack(id); signal.throwIfAborted();
        if (!pack) throw new Error('资料包已被其他页面删除，请重新打开资源管理');
        await writeSetting('active', id); signal.throwIfAborted();
        if (mounted.current) { setActive(id); onActivate(importTemplatePack(pack)); }
    };
    const install = async (pack: TemplatePack, identity: { id: string; name: string; source: string }, signal: AbortSignal) => {
        signal.throwIfAborted(); if (mounted.current) setProgress('正在校验并保存本地缓存…');
        await savePack(pack, identity);
        const items = await listPacks();
        if (mounted.current) { setPacks(items); setActive(identity.id); onActivate(importTemplatePack(pack)); }
    };
    const fetchInitial = () => run(async signal => {
        const pack = await downloadRemotePack(signal, message => { if (mounted.current) setProgress(message); });
        await install(pack, { id: '4e-next', name: '4E NEXT 初始资料', source: REMOTE_SOURCE }, signal);
    });
    const importFile = (file?: File) => {
        if (!file) return;
        void run(async signal => {
            if (file.size > 100 * 1024 * 1024) throw new Error('单个资料包上限为 100 MB，请拆分后导入');
            setProgress('正在读取资料包…');
            await install(JSON.parse(await file.text()), { id: crypto.randomUUID(), name: file.name.replace(/\.json$/i, ''), source: '本地导入' }, signal);
        });
    };
    const remove = (id: string) => run(async signal => {
        await deletePack(id); const items = await listPacks(); setPendingDelete('');
        if (!mounted.current) return;
        setPacks(items);
        if (active === id) {
            clearTemplatePack(); setActive(''); onActivate(null);
            if (items.length) await activate(items[0].id, signal);
        }
    });
    const logicalBytes = packs.reduce((sum, pack) => sum + pack.bytes, 0);
    const quota = estimate?.quota;
    const usage = estimate?.usage;
    const percentage = quota && usage !== undefined ? Math.min(100, usage / quota * 100) : null;
    const largest = [...packs].sort((a, b) => b.bytes - a.bytes)[0];
    return <>
        <section className="cache-usage manager-card" aria-label="浏览器缓存占用">
            <div className="manager-heading"><h3>▤ 浏览器缓存占用</h3><span>{usage === undefined ? '占用未知' : formatBytes(usage)} / {quota ? formatBytes(quota) : '配额由浏览器决定'} {percentage !== null && <small>{percentage.toFixed(1)}%</small>}</span></div>
            <progress max={100} value={percentage ?? undefined} aria-label="同源存储占用比例" />
            <div className="cache-breakdown"><span>初始资料与导入包 <strong>{formatBytes(logicalBytes)}</strong></span><span>作者存档与术语（估算） <strong>{formatBytes(authorBytes)}</strong></span><span>最大资料包 <strong>{largest ? `${largest.name} · ${formatBytes(largest.bytes)}` : '尚未加载'}</strong></span></div>
            <p className="progression-hint">资料包使用 IndexedDB，不受 localStorage 的约 5 MB 限制。上方为整个同源站点的估算；资料包大小为 JSON 大小，两者不会完全一致。</p>
            <div className="toolbar"><span>{persistent === null ? '缓存保留状态未知' : persistent ? '浏览器已允许持久保留' : '普通缓存，可申请保留'}</span><button className="btn" disabled={busy || persistent === true || !navigator.storage?.persist} onClick={() => void run(async () => { setProgress('正在申请保留缓存…'); const allowed = await navigator.storage.persist(); setPersistent(allowed); if (!allowed) setError('浏览器未批准持久保留，现有缓存仍可使用。'); })}>申请保留缓存</button></div>
        </section>
        <section className="pack-manager manager-card" aria-label="已加载资源包">
            <div className="manager-heading"><h3>▣ 资源包</h3><small>{packs.length} 个包 · {packs.reduce((sum, pack) => sum + pack.count, 0)} 条资源</small></div>
            <p className="progression-hint">初始资料获取一次后自动从本地恢复；切换资料包查看模板，草稿不会随缓存删除。</p>
            <div className="pack-actions"><button className="btn btn-primary" disabled={busy} onClick={() => void fetchInitial()}>{packs.some(pack => pack.id === '4e-next') ? '更新 4E NEXT' : '获取 4E NEXT 初始资料'}</button><label className={`btn import-button ${busy ? 'disabled' : ''}`}>导入资料包<input disabled={busy} aria-label="导入初始资料包" type="file" accept=".json,application/json" onChange={event => { importFile(event.target.files?.[0]); event.target.value = ''; }} /></label></div>
            {busy && <div role="status" className="cache-progress">{progress}{(progress.includes('下载') || progress.includes('检查 4E')) && <button className="btn" onClick={() => operation.current?.abort()}>取消下载</button>}</div>}
            {error && <p role="alert" className="feedback feedback-error">{error}</p>}
            {!packs.length && !busy && <div className="empty-state">尚未加载资源包。获取初始资料，或导入已有的 4E NEXT JSON 资料包。</div>}
            {packs.map(pack => <article key={pack.id} className={`pack-card ${active === pack.id ? 'active' : ''}`}>
                <button className="pack-select" disabled={busy} onClick={() => void run(signal => activate(pack.id, signal))}><strong>{pack.name}</strong><small>{pack.count} 条 · {formatBytes(pack.bytes)} {active === pack.id ? '· 当前使用' : ''}</small></button>
                <small className="pack-version">{pack.sourceVersion}</small><small>缓存于 {new Date(pack.downloadedAt).toLocaleString('zh-CN')}</small>
                <div className="toolbar"><button className="btn" disabled={busy} onClick={() => void run(async signal => { const value = await readPack(pack.id); signal.throwIfAborted(); if (!value) throw new Error('资料包不存在'); downloadJSON(value, `${pack.name}.json`); })}>导出</button><button className="btn" disabled={busy} onClick={() => setPendingDelete(pack.id)}>删除缓存</button></div>
                {pendingDelete === pack.id && <div className="cache-delete"><span>确认删除此资料包缓存？</span><button className="btn btn-danger" disabled={busy} onClick={() => void remove(pack.id)}>确认删除</button><button className="btn" disabled={busy} onClick={() => setPendingDelete('')}>取消</button></div>}
            </article>)}
        </section>
    </>;
}

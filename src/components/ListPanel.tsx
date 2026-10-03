import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';
import { TermDisplay } from './TermDisplay';
import { useState } from 'react';
import type { Item } from '../types';
import { resourceSearchText } from '../utils/resources';
import { BUILTIN_COLORS } from '../utils/color-library';
import { useColorLibrary } from '../hooks/ColorLibraryContext';
interface ListPanelProps {
    items: Item[]; currentItemId: string | null; onSelect: (id: string) => void;
    onCreate: () => void; onTemplate?: () => void; templateBlocked?: boolean; onImport?: (file: File) => void; onDelete: (id: string) => void;
    onDuplicate: (id: string) => void; onExportItems: (ids: string[]) => void;
    onBundle: (ids: string[], images: boolean) => void; busy: boolean;
    onApplyColor: (ids: string[], color: string | undefined, includePowers: boolean) => void;
    colorBlocked: boolean;
}
export function ListPanel({ items, currentItemId, onSelect, onCreate, onTemplate, templateBlocked, onImport, onDelete, onDuplicate, onExportItems, onBundle, busy, onApplyColor, colorBlocked }: ListPanelProps) {
    const { terminology } = useTerminology();
    const display = createTermTranslator(terminology);
    const [collapsed, setCollapsed] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [filter, setFilter] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [batchColor, setBatchColor] = useState('');
    const [includePowers, setIncludePowers] = useState(false);
    const library = useColorLibrary();
    const palettes = [...BUILTIN_COLORS, ...library.colors];
    const chosenColor = batchColor === 'default' || palettes.some(entry => entry.color === batchColor) ? batchColor : '';
    const filteredItems = items.filter(item => [resourceSearchText(item), resourceSearchText(item, display)].some(text => text.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())));
    const selectedIds = selected.filter(id => items.some(item => item.id === id));
    if (collapsed) return <aside className="list-panel list-collapsed" aria-label="资源列表已收起"><button className="btn list-toggle" onClick={() => setCollapsed(false)} aria-label="展开资源列表" title="展开资源列表">展开列表</button></aside>;
    return <aside className="list-panel" aria-label="资源列表">
        <div className="list-header">
            <div className="list-heading"><strong>当前资源</strong><button className="btn btn-subtle" onClick={() => setCollapsed(true)} aria-label="收起资源列表">收起</button></div>
            <div className="toolbar list-create-actions"><button className="btn btn-primary" onClick={onCreate}><TermDisplay>{"+ 新建"}</TermDisplay></button>
                {onTemplate && <button className="btn" disabled={templateBlocked} onClick={onTemplate}><TermDisplay>{"从 4E 模板创建"}</TermDisplay></button>}
                {onImport && <label className="btn import-button"><TermDisplay>{"导入卡片"}</TermDisplay><input aria-label="当前工具导入 JSON、PNG 或 ZIP" type="file" accept=".json,.png,.zip" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImport(file); }} /></label>}
            </div>
            <div className="resource-search"><input className="form-control" type="search" aria-label="搜索当前资源库" placeholder="搜索名称或规则内容…" value={filter} onChange={event => setFilter(event.target.value)} />{filter && <button className="btn" onClick={() => setFilter('')}><TermDisplay>{"清除"}</TermDisplay></button>}</div>
            <p className="list-count" role="status">{<TermDisplay>{filter.trim() ? `匹配 ${filteredItems.length} / ${items.length} 条` : `共 ${items.length} 条资源`}</TermDisplay>}{<TermDisplay>{selectedIds.length ? ` · 已选 ${selectedIds.length} 条` : ''}</TermDisplay>}</p>
            <button type="button" className="btn batch-toggle" aria-expanded={batchMode} onClick={() => { setBatchMode(!batchMode); setSelected([]); }}><TermDisplay>{batchMode ? '退出批量操作' : '批量操作'}</TermDisplay></button>
            {batchMode && <div className="list-batch"><div className="toolbar"><button className="btn" disabled={!selectedIds.length} onClick={() => onExportItems(selectedIds)}>导出选中 JSON</button></div><div className="toolbar"><button className="btn" onClick={() => setSelected([...new Set([...selectedIds, ...filteredItems.map(item => item.id)])])}><TermDisplay>{"选择搜索结果"}</TermDisplay></button><button className="btn" onClick={() => setSelected([])}><TermDisplay>{"清空选择"}</TermDisplay></button></div>
            <div className="batch-color"><label><TermDisplay>{"标题配色 "}</TermDisplay><select aria-label="选中卡片的标题配色" value={chosenColor} onChange={event => setBatchColor(event.target.value)}><option value=""><TermDisplay>{"选择配色"}</TermDisplay></option><option value="default"><TermDisplay>{"恢复类型默认色"}</TermDisplay></option><optgroup label="内置配色">{BUILTIN_COLORS.map(entry => <option key={entry.id} value={entry.color}>{<TermDisplay>{entry.name}</TermDisplay>}</option>)}</optgroup><optgroup label="我的配色">{library.colors.map(entry => <option key={entry.id} value={entry.color}>{<TermDisplay>{entry.name}</TermDisplay>}</option>)}</optgroup></select></label>
                {chosenColor && chosenColor !== 'default' && <span className="header-color-swatch" style={{ backgroundColor: chosenColor }} aria-hidden="true" />}
                {items.some(item => Array.isArray(item.powers)) && <label><input type="checkbox" checked={includePowers} onChange={event => setIncludePowers(event.target.checked)} /><TermDisplay>{"同时应用到附属威能"}</TermDisplay></label>}
                <button type="button" className="btn" disabled={busy || colorBlocked || !selectedIds.length || !chosenColor} onClick={() => onApplyColor(selectedIds, chosenColor === 'default' ? undefined : chosenColor, includePowers)}><TermDisplay>{"应用到选中 "}</TermDisplay>{<TermDisplay>{selectedIds.length}</TermDisplay>}<TermDisplay>{" 张"}</TermDisplay></button>
                <small>{<TermDisplay>{colorBlocked ? '请先保存或放弃当前草稿，再批量配色。' : '覆盖选中卡片的标题色带并保存，正文保持不变。'}</TermDisplay>}</small>
            </div>
            <div className="toolbar"><button className="btn" disabled={busy || !selectedIds.length} onClick={() => onBundle(selectedIds, false)}><TermDisplay>{"打包 JSON"}</TermDisplay></button><button className="btn" disabled={busy || !selectedIds.length} onClick={() => onBundle(selectedIds, true)}><TermDisplay>{"打包 PNG＋JSON"}</TermDisplay></button></div>
            </div>}
        </div>
        <div id="itemList">
            {!items.length && <p className="empty-state"><TermDisplay>{"此资源库暂无条目。新建空白资源，或从 4E 模板开始制作。"}</TermDisplay></p>}
            {!!items.length && !filteredItems.length && <p className="empty-state"><TermDisplay>{"未找到匹配资源。"}</TermDisplay></p>}
            {filteredItems.map(item => <div key={item.id} className={`list-item ${item.id === currentItemId ? 'active' : ''}`}>
                {batchMode && <input type="checkbox" aria-label={`选择 ${item.name}`} checked={selectedIds.includes(item.id)} onChange={event => setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />}
                <button className="resource-select" aria-current={item.id === currentItemId ? 'true' : undefined} onClick={() => onSelect(item.id)}><span className="item-main">{<TermDisplay>{item.name || '未命名条目'}</TermDisplay>}</span>
                    <span className="item-sub">{<TermDisplay>{typeof item.cls === 'string' ? item.cls : typeof item.tier === 'string' ? item.tier : item.entryLevel ? `${String(item.entryLevel)}级起` : item.level !== undefined ? `等级 ${String(item.level)}` : ''}</TermDisplay>}</span>
                </button>
                <details className="item-actions"><summary aria-label={`更多操作：${item.name}`} title="更多操作">更多</summary><div className="item-action-menu">
                    <button className="btn" title="复制条目" aria-label={`复制 ${item.name}`} onClick={() => onDuplicate(item.id)}><TermDisplay>{"复制"}</TermDisplay></button>
                    <button className="btn" title="导出单条 JSON" aria-label={`导出 ${item.name}`} onClick={() => onExportItems([item.id])}><TermDisplay>{"导出"}</TermDisplay></button>
                    <button className="btn" title="删除条目" aria-label={`删除 ${item.name}`} onClick={() => onDelete(item.id)}><TermDisplay>{"删除"}</TermDisplay></button>
                </div></details>
            </div>)}
        </div>
    </aside>;
}

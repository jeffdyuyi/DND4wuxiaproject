import { useState } from 'react';
import type { Item } from '../types';
import { resourceSearchText } from '../utils/resources';
interface ListPanelProps {
    items: Item[]; currentItemId: string | null; onSelect: (id: string) => void;
    onCreate: () => void; onDelete: (id: string) => void;
    onDuplicate: (id: string) => void; onExportItems: (ids: string[]) => void;
}
export function ListPanel({ items, currentItemId, onSelect, onCreate, onDelete, onDuplicate, onExportItems }: ListPanelProps) {
    const [filter, setFilter] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const filteredItems = items.filter(item => resourceSearchText(item).includes(filter.trim().toLocaleLowerCase()));
    const selectedIds = selected.filter(id => items.some(item => item.id === id));
    return <aside className="list-panel" aria-label="资源列表">
        <div className="list-header">
            <div className="toolbar"><button className="btn btn-primary" onClick={onCreate}>+ 新建</button>
                <button className="btn" disabled={!selectedIds.length} onClick={() => onExportItems(selectedIds)}>导出选中 ({selectedIds.length})</button></div>
            <input className="form-control" aria-label="搜索当前资源库" placeholder="搜索名称或规则内容…" value={filter} onChange={event => setFilter(event.target.value)} />
        </div>
        <div id="itemList">
            {!items.length && <p className="empty-state">此资源库暂无条目。点击“新建”开始制作，或导入 JSON。</p>}
            {!!items.length && !filteredItems.length && <p className="empty-state">未找到匹配资源。</p>}
            {filteredItems.map(item => <div key={item.id} className={`list-item ${item.id === currentItemId ? 'active' : ''}`}>
                <input type="checkbox" aria-label={`选择 ${item.name}`} checked={selectedIds.includes(item.id)} onChange={event => setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))} />
                <button className="resource-select" onClick={() => onSelect(item.id)}><span className="item-main">{item.name || '未命名条目'}</span>
                    <span className="item-sub">{typeof item.cls === 'string' ? item.cls : typeof item.tier === 'string' ? item.tier : item.entryLevel ? `${String(item.entryLevel)}级起` : item.level !== undefined ? `等级 ${String(item.level)}` : ''}</span>
                </button>
                <div className="item-actions">
                    <button className="btn" title="复制条目" aria-label={`复制 ${item.name}`} onClick={() => onDuplicate(item.id)}>⧉</button>
                    <button className="btn" title="导出单条 JSON" aria-label={`导出 ${item.name}`} onClick={() => onExportItems([item.id])}>↓</button>
                    <button className="btn" title="删除条目" aria-label={`删除 ${item.name}`} onClick={() => onDelete(item.id)}>×</button>
                </div>
            </div>)}
        </div>
    </aside>;
}


import React, { useState } from 'react';
import type { Item } from '../types';

interface ListPanelProps {
    items: Item[];
    currentItemId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
    onExport: () => void;
    onImport: (file: File) => void;
}

export const ListPanel: React.FC<ListPanelProps> = ({
    items, currentItemId, onSelect, onCreate, onDelete, onExport, onImport
}) => {
    const [filter, setFilter] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onImport(e.target.files[0]);
        }
    };

    const filteredItems = items.filter(i => i.name.includes(filter));

    return (
        <div className="list-panel">
            <div className="list-header">
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button className="btn" style={{ flex: 1, padding: '4px' }} onClick={onCreate}>+ 新建</button>
                    <button className="btn" style={{ padding: '4px' }} onClick={onExport} title="导出当前库">💾</button>
                    <label className="btn" style={{ padding: '4px', cursor: 'pointer' }} title="导入数据">
                        📂
                        <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".json" />
                    </label>
                </div>
                <input
                    type="text"
                    style={{ width: '100%', marginTop: '5px', padding: '4px', boxSizing: 'border-box' }}
                    placeholder="搜索..."
                    value={filter}
                    onInput={(e) => setFilter(e.currentTarget.value)}
                />
            </div>
            <div id="itemList">
                {filteredItems.map(item => {
                    // Determine subtitle
                    let sub = '';
                    if ('cls' in item) sub = item.cls;
                    else if ('type' in item && typeof item.type === 'string' && item.type !== 'basic') sub = item.type;
                    else if ('tier' in item) sub = item.tier as string;
                    else if ('level' in item) sub = 'Lv' + item.level;

                    return (
                        <div
                            key={item.id}
                            className={`list-item ${item.id === currentItemId ? 'active' : ''}`}
                            onClick={() => onSelect(item.id)}
                        >
                            <div>
                                <span className="item-main">{item.name}</span>
                                <div className="item-sub">{sub}</div>
                            </div>
                            <span
                                className="del-btn"
                                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            >×</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

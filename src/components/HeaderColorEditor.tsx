import { useState } from 'react';
import type { ModuleType } from '../constants';
import type { Item } from '../types';
import { defaultHeaderColor, isHeaderColor, resolveHeaderColor } from '../utils/card-colors';

export function HeaderColorEditor({ module, item, onChange }: { module: ModuleType; item: Item; onChange: (item: Item) => void }) {
    const color = resolveHeaderColor(module, item);
    const [input, setInput] = useState({ base: color, value: color });
    const hex = input.base === color ? input.value : color;
    const [error, setError] = useState('');
    const update = (value: string) => { setInput({ base: value.toUpperCase(), value: value.toUpperCase() }); setError(''); onChange({ ...item, headerColor: value.toUpperCase() }); };
    const reset = () => {
        const next = { ...item }; delete next.headerColor;
        const defaultColor = defaultHeaderColor(module, item);
        setInput({ base: defaultColor, value: defaultColor }); setError(''); onChange(next);
    };
    return <details className="header-color-editor"><summary>标题色带 · {isHeaderColor(item.headerColor) ? '单卡自定义' : '类型默认色'}<span className="header-color-swatch" style={{ backgroundColor: color }} aria-hidden="true" /></summary>
        <div className="header-color-controls">
            <label>选择颜色 <input type="color" aria-label="卡片标题底色" value={color} onChange={event => update(event.target.value)} /></label>
            <label>色值 <input aria-label="标题底色十六进制色值" value={hex} placeholder="#RRGGBB" maxLength={7} onChange={event => { setInput({ base: color, value: event.target.value }); setError(''); }} onBlur={() => {
                if (isHeaderColor(hex)) { if (hex.toUpperCase() !== color) update(hex); }
                else setError('请输入完整色值，例如 #315C48。');
            }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (isHeaderColor(hex)) update(hex); else setError('请输入完整色值，例如 #315C48。'); } }} /></label>
            <button type="button" className="btn" onClick={reset}>恢复类型默认色</button>
        </div>
        {error && <p role="alert">{error}</p>}
        <small>只调整标题文字后的色带；标题文字自动适配明暗。颜色随保存和导出保留。</small>
    </details>;
}

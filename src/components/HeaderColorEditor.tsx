import { TermDisplay } from './TermDisplay';
import { useState } from 'react';
import type { ModuleType } from '../constants';
import type { Item } from '../types';
import { defaultHeaderColor, isHeaderColor, resolveHeaderColor } from '../utils/card-colors';
import { BUILTIN_COLORS } from '../utils/color-library';
import { useColorLibrary } from '../hooks/ColorLibraryContext';
import { downloadJSON } from '../utils/archive';

export function HeaderColorEditor({ module, item, onChange }: { module: ModuleType; item: Item; onChange: (item: Item) => void }) {
    const color = resolveHeaderColor(module, item);
    const [input, setInput] = useState({ base: color, value: color });
    const hex = input.base === color ? input.value : color;
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [notice, setNotice] = useState('');
    const library = useColorLibrary();
    const update = (value: string) => { setInput({ base: value.toUpperCase(), value: value.toUpperCase() }); setError(''); setNotice(''); onChange({ ...item, headerColor: value.toUpperCase() }); };
    const reset = () => {
        const next = { ...item }; delete next.headerColor;
        const defaultColor = defaultHeaderColor(module, item);
        setInput({ base: defaultColor, value: defaultColor }); setError(''); onChange(next);
    };
    return <details className="header-color-editor"><summary><TermDisplay>{"标题色带与配色库 · "}</TermDisplay>{<TermDisplay>{isHeaderColor(item.headerColor) ? '单卡自定义' : '类型默认色'}</TermDisplay>}<span className="header-color-swatch" style={{ backgroundColor: color }} aria-hidden="true" /></summary>
        <p className="palette-heading"><TermDisplay>{"内置配色"}</TermDisplay></p>
        <div className="palette-grid">{BUILTIN_COLORS.map(entry => <button type="button" className="palette-choice" key={entry.id} aria-pressed={color === entry.color} title={`${entry.name} ${entry.color}`} onClick={() => update(entry.color)}><span className="header-color-swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />{<TermDisplay>{entry.name}</TermDisplay>}</button>)}</div>
        <p className="palette-heading"><TermDisplay>{"我的配色 "}</TermDisplay><small><TermDisplay>{"选择即应用到当前卡片；删除配色不会改变已使用的卡片。"}</TermDisplay></small></p>
        {library.colors.length ? <div className="palette-grid">{library.colors.map(entry => <div className="palette-saved" key={entry.id}><button type="button" className="palette-choice" aria-pressed={color === entry.color} title={`${entry.name} ${entry.color}`} onClick={() => { update(entry.color); setName(entry.name); setNotice(''); }}><span className="header-color-swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />{<TermDisplay>{entry.name}</TermDisplay>}</button><button type="button" className="palette-remove" aria-label={`删除配色 ${entry.name}`} disabled={library.blocked} onClick={() => library.remove(entry.id)}><TermDisplay>{"×"}</TermDisplay></button></div>)}</div> : <small><TermDisplay>{"暂无自定义配色，设计颜色后为它命名并保存。"}</TermDisplay></small>}
        <div className="header-color-controls">
            <label><TermDisplay>{"选择颜色 "}</TermDisplay><input type="color" aria-label="卡片标题底色" value={color} onChange={event => update(event.target.value)} /></label>
            <label><TermDisplay>{"色值 "}</TermDisplay><input aria-label="标题底色十六进制色值" value={hex} placeholder="#RRGGBB" maxLength={7} onChange={event => { setInput({ base: color, value: event.target.value }); setError(''); }} onBlur={() => {
                if (isHeaderColor(hex)) { if (hex.toUpperCase() !== color) update(hex); }
                else setError('请输入完整色值，例如 #315C48。');
            }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (isHeaderColor(hex)) update(hex); else setError('请输入完整色值，例如 #315C48。'); } }} /></label>
            <button type="button" className="btn" onClick={reset}><TermDisplay>{"恢复类型默认色"}</TermDisplay></button>
        </div>
        <div className="palette-save"><label><TermDisplay>{"配色名称 "}</TermDisplay><input aria-label="新配色名称" placeholder="例如：竹影青" maxLength={40} value={name} onChange={event => { setName(event.target.value); setNotice(''); }} /></label><button type="button" className="btn" disabled={library.blocked || !name.trim() || !isHeaderColor(hex)} onClick={() => {
            const result = library.save(name, hex);
            setNotice(result.ok ? '配色已保存。同色配色再次保存会更新名称。' : result.error);
        }}><TermDisplay>{"保存到配色库"}</TermDisplay></button></div>
        {notice && <p role="status">{<TermDisplay>{notice}</TermDisplay>}</p>}
        {library.error && <p role="alert">{<TermDisplay>{library.error}</TermDisplay>}{library.recovery !== null && <button type="button" className="btn" onClick={() => downloadJSON({ raw: library.recovery }, '吾侠_配色库恢复原文.json')}><TermDisplay>{"导出恢复原文"}</TermDisplay></button>}</p>}
        {error && <p role="alert">{<TermDisplay>{error}</TermDisplay>}</p>}
        <small><TermDisplay>{"配色库独立保存在当前浏览器。当前卡片的颜色仍需保存；颜色随卡片导出保留。"}</TermDisplay></small>
    </details>;
}

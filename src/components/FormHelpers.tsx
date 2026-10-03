import { TermDisplay } from './TermDisplay';
import { useId, useState } from 'react';
import { RangeTypes, Shapes, Stats } from '../constants';
import { useTerminology } from '../hooks/TerminologyContext';
import { keywordCategories, splitTerms, TermCategories, type TermCategory } from '../utils/terminology';
import { createTermTranslator } from '../utils/term-display';
import { TermSelect } from './TermControls';
import type { Trait } from '../types';
import { buildRange, parseRange } from '../utils/range';
interface FieldProps { label: string; value?: string | number; onChange: (value: string) => void; }
export function Input({ label, value, onChange }: FieldProps) {
    const id = useId();
    const { terminology } = useTerminology();
    const raw = /原版|来源|参考|名称|名字|标题/.test(label);
    const display = createTermTranslator(terminology, false, /范围/.test(label) ? 'range' : undefined);
    const canonical = createTermTranslator(terminology, true, /范围/.test(label) ? 'range' : undefined);
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label><input id={id} type="text" className="form-control" value={raw ? value ?? '' : display(String(value ?? ''))} onChange={event => onChange(raw ? event.target.value : canonical(event.target.value))} /></div>;
}
export function Text({ label, value, onChange }: FieldProps) {
    const id = useId();
    const { terminology } = useTerminology();
    const raw = /原版|来源|参考/.test(label);
    const display = createTermTranslator(terminology);
    const canonical = createTermTranslator(terminology, true);
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label><textarea id={id} className="form-control" value={raw ? value ?? '' : display(String(value ?? ''))} onChange={event => onChange(raw ? event.target.value : canonical(event.target.value))} /></div>;
}
export function Select({ label, value, onChange, options }: FieldProps & { options: readonly { v: string; t: string }[] }) {
    const id = useId();
    const unknown = value !== undefined && value !== '' && !options.some(option => option.v === String(value));
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label><select id={id} className="form-control" value={value ?? ''} onChange={event => onChange(event.target.value)}>
        {unknown && <option value={value}>{<TermDisplay>{value}</TermDisplay>}<TermDisplay>{"（自定义）"}</TermDisplay></option>}{options.map(option => <option key={option.v} value={option.v}>{<TermDisplay>{option.t}</TermDisplay>}</option>)}
    </select></div>;
}
export function KeywordSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { terminology, collect } = useTerminology();
    const [category, setCategory] = useState<TermCategory>('other');
    const [search, setSearch] = useState('');
    const display = createTermTranslator(terminology, false, 'keyword');
    const canonical = createTermTranslator(terminology, true, 'keyword');
    const current = splitTerms(canonical(value));
    const toggle = (tag: string) => onChange((current.includes(tag) ? current.filter(key => key !== tag) : [...current, tag]).join('，'));
    const remember = (text: string, explicit = false) => {
        const unknown = splitTerms(text).filter(word => !terminology.entries.some(term =>
            term.label.toLocaleLowerCase() === word.toLocaleLowerCase() || term.value.toLocaleLowerCase() === word.toLocaleLowerCase()));
        collect(category, unknown.join('，'), explicit);
    };
    const id = useId();
    return <div className="form-group"><strong><TermDisplay>{"功法属性"}</TermDisplay></strong>
        <input aria-label="筛选关键词" className="form-control" placeholder="搜索可选关键词…" value={search} onChange={event => setSearch(event.target.value)} />
        {keywordCategories.map(group => <details className="term-keywords" key={group} open={!!search || undefined}><summary>{<TermDisplay>{TermCategories[group]}</TermDisplay>}</summary><div className="keyword-group">
            {terminology.entries.filter(term => term.category === group && !term.hidden && term.label.includes(search.trim())).map(term =>
                <button type="button" key={term.id} title={term.reference ? `参考：${term.reference}` : '自定义词'} aria-pressed={current.includes(term.original || term.value)} className={`check-btn ${current.includes(term.label) ? 'selected' : ''}`} onClick={() => toggle(term.original || term.value)}>{<TermDisplay scope={term.category}>{term.label}</TermDisplay>}</button>)}
        </div></details>)}
        <label htmlFor={id}><TermDisplay>{"自定义关键词（逗号分隔）"}</TermDisplay></label>
        <input id={id} className="form-control" value={display(value)} onChange={event => onChange(canonical(event.target.value))} onBlur={event => remember(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); remember(event.currentTarget.value); } }} />
        <div className="row term-toolbar"><label><TermDisplay>{"新词归类"}</TermDisplay><select aria-label="新关键词分类" value={category} onChange={event => setCategory(event.target.value as TermCategory)}>
            {keywordCategories.map(group => <option key={group} value={group}>{<TermDisplay>{TermCategories[group]}</TermDisplay>}</option>)}
        </select></label><button type="button" className="btn" onClick={() => remember(value, true)}><TermDisplay>{"收录新词"}</TermDisplay></button></div>
    </div>;
}
export function RangeBuilder({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const parts = parseRange(value);
    const update = (patch: Partial<typeof parts>) => onChange(buildRange({ ...parts, ...patch }));
    return <div className="form-group"><strong><TermDisplay scope="range">{"范围构建器"}</TermDisplay></strong><div className="range-builder">
        <select aria-label="范围类型" value={parts.type} onChange={event => update({ type: event.target.value })}>{Object.entries(RangeTypes).map(([key, title]) => <option key={key} value={key}>{<TermDisplay scope="range">{title.split('(')[0]}</TermDisplay>}</option>)}</select>
        {(parts.type === 'Close' || parts.type === 'Area') && <select aria-label="范围形状" value={parts.shape} onChange={event => update({ shape: event.target.value })}>{Object.entries(Shapes).map(([key, title]) => <option key={key} value={key}>{<TermDisplay scope="range">{title}</TermDisplay>}</option>)}</select>}
        <input aria-label="距离或范围大小" placeholder="距离/兵器" value={parts.distance} onChange={event => update({ distance: event.target.value })} />
        {parts.type === 'Area' && <input aria-label="区域射程" placeholder="射程" value={parts.reach} onChange={event => update({ reach: event.target.value })} />}
    </div><Input label="范围文本（可直接编辑）" value={value} onChange={onChange} /></div>;
}
export function AttackBuilder({ att, def, defLabel, onUpdate }: { att: string; def: string; defLabel?: string; onUpdate: (att: string, def: string, label?: string) => void }) {
    return <div className="row"><div className="col"><Input label="攻击属性 / 公式（可留空）" value={att} onChange={value => onUpdate(value, def)} /><small>{<TermDisplay>{Stats.join(' / ')}</TermDisplay>}</small></div>
        <div className="col"><TermSelect label="目标防御" category="defense" value={def} snapshot={defLabel} emptyLabel="无攻击检定" onChange={(value, label) => onUpdate(att, value, label)} /></div></div>;
}
export function TraitListEditor({ label, value = [], onChange }: { label: string; value?: Trait[]; onChange: (value: Trait[]) => void }) {
    const update = (id: string, patch: Partial<Trait>) => onChange(value.map(trait => trait.id === id ? { ...trait, ...patch } : trait));
    return <section><h3>{<TermDisplay>{label}</TermDisplay>}</h3>{value.map(trait => <div className="progression-editor-section" key={trait.id}>
        <Input label="特性名称" value={trait.name} onChange={name => update(trait.id, { name })} />
        <Text label="特性说明" value={trait.desc} onChange={desc => update(trait.id, { desc })} />
        <button type="button" className="btn" onClick={() => onChange(value.filter(current => current.id !== trait.id))}><TermDisplay>{"删除特性"}</TermDisplay></button>
    </div>)}<button type="button" className="btn" onClick={() => onChange([...value, { id: crypto.randomUUID(), name: '', desc: '' }])}><TermDisplay>{"+ 添加特性"}</TermDisplay></button></section>;
}

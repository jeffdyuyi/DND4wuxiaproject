import { useId } from 'react';
import { Keywords, RangeTypes, Shapes, Stats, Defenses } from '../constants';
import type { Trait } from '../types';
import { buildRange, parseRange } from '../utils/range';
interface FieldProps { label: string; value?: string | number; onChange: (value: string) => void; }
export function Input({ label, value, onChange }: FieldProps) {
    const id = useId();
    return <div className="form-group"><label htmlFor={id}>{label}</label><input id={id} type="text" className="form-control" value={value ?? ''} onChange={event => onChange(event.target.value)} /></div>;
}
export function Text({ label, value, onChange }: FieldProps) {
    const id = useId();
    return <div className="form-group"><label htmlFor={id}>{label}</label><textarea id={id} className="form-control" value={value ?? ''} onChange={event => onChange(event.target.value)} /></div>;
}
export function Select({ label, value, onChange, options }: FieldProps & { options: readonly { v: string; t: string }[] }) {
    const id = useId();
    const unknown = value !== undefined && value !== '' && !options.some(option => option.v === String(value));
    return <div className="form-group"><label htmlFor={id}>{label}</label><select id={id} className="form-control" value={value ?? ''} onChange={event => onChange(event.target.value)}>
        {unknown && <option value={value}>{value}（自定义）</option>}{options.map(option => <option key={option.v} value={option.v}>{option.t}</option>)}
    </select></div>;
}
export function KeywordSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const current = value.split(/[,，]\s*/).filter(Boolean);
    const toggle = (tag: string) => onChange((current.includes(tag) ? current.filter(key => key !== tag) : [...current, tag]).join('，'));
    return <div className="form-group"><strong>功法属性</strong>
        {Object.entries(Keywords).map(([group, words], index) => <div className="keyword-group" key={group}><span className="keyword-group-title">{['来源', '伤害', '效应', '器材'][index]}</span>
            {words.map(word => <button type="button" key={word} aria-pressed={current.includes(word)} className={`check-btn ${current.includes(word) ? 'selected' : ''}`} onClick={() => toggle(word)}>{word}</button>)}
        </div>)}
        <Input label="自定义关键词（逗号分隔）" value={value} onChange={onChange} />
    </div>;
}
export function RangeBuilder({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const parts = parseRange(value);
    const update = (patch: Partial<typeof parts>) => onChange(buildRange({ ...parts, ...patch }));
    return <div className="form-group"><strong>范围构建器</strong><div className="range-builder">
        <select aria-label="范围类型" value={parts.type} onChange={event => update({ type: event.target.value })}>{Object.entries(RangeTypes).map(([key, title]) => <option key={key} value={key}>{title.split('(')[0]}</option>)}</select>
        {(parts.type === 'Close' || parts.type === 'Area') && <select aria-label="范围形状" value={parts.shape} onChange={event => update({ shape: event.target.value })}>{Object.entries(Shapes).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select>}
        <input aria-label="距离或范围大小" placeholder="距离/兵器" value={parts.distance} onChange={event => update({ distance: event.target.value })} />
        {parts.type === 'Area' && <input aria-label="区域射程" placeholder="射程" value={parts.reach} onChange={event => update({ reach: event.target.value })} />}
    </div><Input label="范围文本（可直接编辑）" value={value} onChange={onChange} /></div>;
}
export function AttackBuilder({ att, def, onUpdate }: { att: string; def: string; onUpdate: (att: string, def: string) => void }) {
    return <div className="row"><div className="col"><Input label="攻击属性 / 公式（可留空）" value={att} onChange={value => onUpdate(value, def)} /><small>{Stats.join(' / ')}</small></div>
        <div className="col"><Select label="目标防御" value={def} onChange={value => onUpdate(att, value)} options={[{ v: '', t: '无攻击检定' }, ...Object.entries(Defenses).map(([v, t]) => ({ v, t }))]} /></div></div>;
}
export function TraitListEditor({ label, value = [], onChange }: { label: string; value?: Trait[]; onChange: (value: Trait[]) => void }) {
    const update = (id: string, patch: Partial<Trait>) => onChange(value.map(trait => trait.id === id ? { ...trait, ...patch } : trait));
    return <section><h3>{label}</h3>{value.map(trait => <div className="progression-editor-section" key={trait.id}>
        <Input label="特性名称" value={trait.name} onChange={name => update(trait.id, { name })} />
        <Text label="特性说明" value={trait.desc} onChange={desc => update(trait.id, { desc })} />
        <button type="button" className="btn" onClick={() => onChange(value.filter(current => current.id !== trait.id))}>删除特性</button>
    </div>)}<button type="button" className="btn" onClick={() => onChange([...value, { id: crypto.randomUUID(), name: '', desc: '' }])}>+ 添加特性</button></section>;
}

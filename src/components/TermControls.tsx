import { useId, useRef, useState } from 'react';
import { useTerminology } from '../hooks/TerminologyContext';
import { TermCategories, type TermCategory } from '../utils/terminology';
import { ActionMap, Defenses, UsageOptions } from '../constants';

/** Suggestions never prevent free text or rewrite a previously authored value. */
export function TermInput({ label, value = '', categories, collectAs = categories[0] , onChange }: {
    label: string; value?: string; categories: TermCategory[]; collectAs?: TermCategory; onChange: (value: string) => void;
}) {
    const id = useId();
    const { terminology, collect } = useTerminology();
    const words = [...new Set(terminology.entries.filter(term => !term.hidden && categories.includes(term.category)).map(term => term.label))];
    const remember = (text: string) => {
        // An existing implement/armor suggestion must not also become a weapon group.
        if (!terminology.entries.some(term => categories.includes(term.category) && term.label === text.trim())) collect(collectAs, text);
    };
    return <div className="form-group"><label htmlFor={id}>{label}</label>
        <input id={id} className="form-control" value={value} list={`${id}-words`} onChange={event => onChange(event.target.value)}
            onBlur={event => remember(event.target.value)} onKeyDown={event => {
                if (event.key === 'Enter') { event.preventDefault(); remember(event.currentTarget.value); }
            }} />
        <datalist id={`${id}-words`}>{words.map(word => <option key={word} value={word} />)}</datalist>
    </div>;
}

export function RuleText({ label, value = '', onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
    const id = useId();
    const ref = useRef<HTMLTextAreaElement>(null);
    const [category, setCategory] = useState<TermCategory>('status');
    const { terminology } = useTerminology();
    return <div className="form-group"><label htmlFor={id}>{label}</label>
        <textarea ref={ref} id={id} className="form-control" value={value} onChange={event => onChange(event.target.value)} />
        <details className="term-custom"><summary>插入术语</summary><div className="row">
            <select aria-label={`${label}的术语分类`} value={category} onChange={event => setCategory(event.target.value as TermCategory)}>
                {Object.entries(TermCategories).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
            </select>
            <select aria-label={`插入${label}的术语`} value="" onChange={event => {
                const word = event.target.value;
                if (!word) return;
                const start = ref.current?.selectionStart ?? value.length;
                const end = ref.current?.selectionEnd ?? start;
                onChange(value.slice(0, start) + word + value.slice(end));
                requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + word.length, start + word.length); });
            }}>
                <option value="">选择要插入的词…</option>
                {terminology.entries.filter(term => term.category === category && !term.hidden).map(term => <option key={term.id} value={term.label}>{term.label}</option>)}
            </select>
        </div></details>
    </div>;
}

export function TermSelect({ label, category, value = '', snapshot, emptyLabel, onChange }: {
    label: string; category: 'defense' | 'action' | 'usage'; value?: string; snapshot?: string; emptyLabel?: string;
    onChange: (value: string, label: string) => void;
}) {
    const id = useId();
    const { terminology, collect } = useTerminology();
    const entries = terminology.entries.filter(term => term.category === category && !term.hidden);
    // Keep old/custom values selectable, including a saved display name from an older vocabulary.
    const current = entries.find(term => term.value === value);
    const originalLabel = category === 'defense' ? Defenses[value as keyof typeof Defenses] : category === 'action' ? ActionMap[value as keyof typeof ActionMap]?.t : UsageOptions.find(option => option.v === value)?.t;
    const savedLabel = snapshot ?? originalLabel;
    const keepSnapshot = value && savedLabel && savedLabel !== current?.label;
    const savedOption = `${id}-snapshot`;
    return <div className="form-group"><label htmlFor={id}>{label}</label>
        <select id={id} className="form-control" value={keepSnapshot ? savedOption : value} onChange={event => {
            const selected = event.target.value;
            if (selected === savedOption) return;
            onChange(selected, entries.find(term => term.value === selected)?.label ?? selected);
        }}>
            {emptyLabel && <option value="">{emptyLabel}</option>}
            {keepSnapshot && <option value={savedOption}>{savedLabel}（卡片原有名称）</option>}
            {value && !current && !keepSnapshot && <option value={value}>{snapshot || value}（卡片原有值）</option>}
            {entries.map(term => <option key={term.id} value={term.value}>{term.label}</option>)}
        </select>
        {category !== 'usage' && <details className="term-custom"><summary>自定义{label}</summary>
            <input className="form-control" aria-label={`输入自定义${label}`} placeholder="输入完整名称后按回车使用" onKeyDown={event => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                const text = event.currentTarget.value.trim();
                if (!text || /[,，、;；\n]/.test(text)) return;
                onChange(text, text); collect(category, text); event.currentTarget.value = '';
            }} />
        </details>}
    </div>;
}

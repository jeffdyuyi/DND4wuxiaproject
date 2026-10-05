import { TermDisplay } from './TermDisplay';
import { useId, useRef, useState } from 'react';
import { useTerminology } from '../hooks/TerminologyContext';
import { TermCategories, type TermCategory } from '../utils/terminology';
import { createTermTranslator, termName } from '../utils/term-display';
import { MarkdownTextarea } from './MarkdownTextarea';

/** Suggestions never prevent free text or rewrite a previously authored value. */
export function TermInput({ label, value = '', categories, collectAs = categories[0] , onChange }: {
    label: string; value?: string; categories: TermCategory[]; collectAs?: TermCategory; onChange: (value: string) => void;
}) {
    const id = useId();
    const { terminology, collect } = useTerminology();
    const display = createTermTranslator(terminology);
    const canonical = createTermTranslator(terminology, true);
    const words = [...new Set(terminology.entries.filter(term => !term.hidden && categories.includes(term.category)).map(term => term.label))];
    const remember = (text: string) => {
        // An existing implement/armor suggestion must not also become a weapon group.
        if (!terminology.entries.some(term => categories.includes(term.category) && term.label === text.trim())) collect(collectAs, text);
    };
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label>
        <input id={id} className="form-control" value={display(value)} list={`${id}-words`} onChange={event => onChange(canonical(event.target.value))}
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
    const display = createTermTranslator(terminology);
    const canonical = createTermTranslator(terminology, true);
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label>
        <MarkdownTextarea textareaRef={ref} id={id} label={label} value={display(value)} onChange={text => onChange(canonical(text))} />
        <details className="term-custom"><summary><TermDisplay>{"插入术语"}</TermDisplay></summary><div className="row">
            <select aria-label={`${label}的术语分类`} value={category} onChange={event => setCategory(event.target.value as TermCategory)}>
                {Object.entries(TermCategories).map(([key, title]) => <option key={key} value={key}>{<TermDisplay>{title}</TermDisplay>}</option>)}
            </select>
            <select aria-label={`插入${label}的术语`} value="" onChange={event => {
                const word = event.target.value;
                if (!word) return;
                const shown = display(value);
                const start = ref.current?.selectionStart ?? shown.length;
                const end = ref.current?.selectionEnd ?? start;
                const inserted = display(word);
                onChange(canonical(shown.slice(0, start) + inserted + shown.slice(end)));
                requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + inserted.length, start + inserted.length); });
            }}>
                <option value=""><TermDisplay>{"选择要插入的词…"}</TermDisplay></option>
                {terminology.entries.filter(term => term.category === category && !term.hidden).map(term => <option key={term.id} value={term.original || term.value}>{<TermDisplay scope={term.category}>{term.label}</TermDisplay>}</option>)}
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
    const current = terminology.entries.find(term => term.category === category && term.value === value);
    const savedLabel = snapshot;
    const keepSnapshot = value && savedLabel && !current;
    if (current?.hidden) entries.push(current);
    const savedOption = `${id}-snapshot`;
    return <div className="form-group"><label htmlFor={id}>{<TermDisplay>{label}</TermDisplay>}</label>
        <select id={id} className="form-control" value={keepSnapshot ? savedOption : value} onChange={event => {
            const selected = event.target.value;
            if (selected === savedOption) return;
            onChange(selected, entries.find(term => term.value === selected)?.label ?? selected);
        }}>
            {emptyLabel && <option value="">{<TermDisplay>{emptyLabel}</TermDisplay>}</option>}
            {keepSnapshot && <option value={savedOption}>{<TermDisplay>{savedLabel}</TermDisplay>}<TermDisplay>{"（卡片原有名称）"}</TermDisplay></option>}
            {value && !current && !keepSnapshot && <option value={value}>{<TermDisplay>{snapshot || value}</TermDisplay>}<TermDisplay>{"（卡片原有值）"}</TermDisplay></option>}
            {entries.map(term => <option key={term.id} value={term.value}>{<TermDisplay scope={term.category}>{termName(term)}</TermDisplay>}</option>)}
        </select>
        {category !== 'usage' && <details className="term-custom"><summary><TermDisplay>{"自定义"}</TermDisplay>{<TermDisplay>{label}</TermDisplay>}</summary>
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

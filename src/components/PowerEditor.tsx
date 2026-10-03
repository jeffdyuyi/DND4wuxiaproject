import { TermDisplay } from './TermDisplay';
import { HeaderColorEditor } from './HeaderColorEditor';
import type { MoveItem } from '../types';
import { Input, Text, KeywordSelector, RangeBuilder, AttackBuilder } from './FormHelpers';
import { TermSelect, RuleText } from './TermControls';
import { moveEntry } from '../utils/reorder';

export function PowerEditor({ item, onChange, embedded = false }: { item: MoveItem; onChange: (item: MoveItem) => void; embedded?: boolean }) {
    const update = <K extends keyof MoveItem>(key: K, value: MoveItem[K]) => onChange({ ...item, [key]: value });
    const rules = item.rules ?? [];
    return <>
        <fieldset className="editor-section"><legend>基础信息</legend>
        <HeaderColorEditor module="moves" item={item} onChange={next => onChange(next as MoveItem)} />
        <Input label="招式 / 威能名称" value={item.name} onChange={value => update('name', value)} />
        <div className="row">
            <div className="col"><Input label="威能等级" value={item.level} onChange={value => { if (/^\d*$/.test(value)) update('level', Number(value)); }} /></div>
            {embedded && <div className="col"><Input label="获得等级" value={item.acquiredLevel} onChange={value => update('acquiredLevel', value)} /></div>}
        </div>
        {!embedded && <Input label="所属门派 / 来源" value={item.cls} onChange={value => update('cls', value)} />}
        <Text label="意境描述" value={item.flavor} onChange={value => update('flavor', value)} />
        </fieldset>
        <fieldset className="editor-section"><legend>使用与攻击</legend>
        <div className="row"><div className="col"><TermSelect label="使用频率" category="usage" value={item.type} snapshot={item.typeLabel} onChange={(value, label) => onChange({ ...item, type: value as MoveItem['type'], typeLabel: label })} /></div>
            <div className="col"><TermSelect label="动作" category="action" value={item.action} snapshot={item.actionLabel} onChange={(value, label) => onChange({ ...item, action: value, actionLabel: label })} /></div></div>
        <KeywordSelector value={item.keywords} onChange={value => update('keywords', value)} />
        <RangeBuilder value={item.range} onChange={value => update('range', value)} />
        <Input label="触发" value={item.trigger} onChange={value => update('trigger', value)} />
        <Input label="目标" value={item.target} onChange={value => update('target', value)} />
        <AttackBuilder att={item.att ?? ''} def={item.def ?? ''} defLabel={item.defLabel} onUpdate={(att, def, label) => onChange({ ...item, att, def, ...(label !== undefined ? { defLabel: label } : {}) })} />
        </fieldset>
        <fieldset className="editor-section"><legend>规则正文</legend>
        {(['hit', 'miss', 'effect', 'sustain', 'special'] as const).map((key, index) => <RuleText key={key} label={['命中', '失手', '效果', '维持', '要求 / 特殊规则'][index]} value={item[key]} onChange={value => update(key, value)} />)}
        <details className="editor-group" open={rules.length > 0}>
            <summary><TermDisplay>{"附加规则段（次攻击、强化、后续效果等）"}</TermDisplay></summary>
            {rules.map((rule, index) => <section className="progression-editor-section" key={rule.id}>
                <Input label="段落标题" value={rule.title} onChange={title => update('rules', rules.map(current => current.id === rule.id ? { ...current, title } : current))} />
                <RuleText label="完整规则" value={rule.text} onChange={text => update('rules', rules.map(current => current.id === rule.id ? { ...current, text } : current))} />
                <div className="toolbar"><button type="button" className="btn" disabled={index === 0} onClick={() => update('rules', moveEntry(rules, index, -1))}><TermDisplay>{"上移"}</TermDisplay></button>
                    <button type="button" className="btn" disabled={index === rules.length - 1} onClick={() => update('rules', moveEntry(rules, index, 1))}><TermDisplay>{"下移"}</TermDisplay></button>
                    <button type="button" className="btn" onClick={() => update('rules', rules.filter(current => current.id !== rule.id))}><TermDisplay>{"删除规则段"}</TermDisplay></button></div>
            </section>)}
            <button type="button" className="btn" onClick={() => update('rules', [...rules, { id: crypto.randomUUID(), title: '', text: '' }])}><TermDisplay>{"+ 添加规则段"}</TermDisplay></button>
        </details>
        </fieldset>
        <details className="editor-group"><summary><TermDisplay>{"来源与原文（原文不印在卡片上）"}</TermDisplay></summary>
            <Input label="来源 / 原版参考" value={item.source} onChange={value => update('source', value)} />
            <Text label="原版全文 / 未拆分内容" value={item.sourceText} onChange={value => update('sourceText', value)} />
        </details>
    </>;
}

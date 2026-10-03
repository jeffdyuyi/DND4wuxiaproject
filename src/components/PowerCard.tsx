import { TermDisplay } from './TermDisplay';
import { useTerminology } from '../hooks/TerminologyContext';
import { termName } from '../utils/term-display';
import { CardHeader } from './CardHeader';
import type { MoveItem } from '../types';
import { ActionMap, Defenses, UsageOptions } from '../constants';
import { RichText } from './RichText';

export function PowerCard({ item, embedded = false }: { item: MoveItem; embedded?: boolean }) {
    const { terminology } = useTerminology();
    const name = (category: string, value: string, fallback: string) => { const term = terminology.entries.find(term => term.category === category && term.value === value); return term ? termName(term) : fallback; };
    const action = ActionMap[item.action as keyof typeof ActionMap];
    const frequency = name('usage', item.type, item.typeLabel ?? UsageOptions.find(option => option.v === item.type)?.t ?? item.type);
    return <div className={embedded ? 'progression-power' : 'wuxia-card'}>
        <CardHeader module={'moves'} item={item}><span className={embedded ? '' : 'card-title'}>{<TermDisplay>{item.name || '未命名威能'}</TermDisplay>}</span>
            <span className="card-meta">{<TermDisplay>{!embedded && item.cls && `${item.cls} · `}</TermDisplay>}{<TermDisplay>{frequency}</TermDisplay>} {<TermDisplay>{item.level}</TermDisplay>}<TermDisplay>{"级"}</TermDisplay>{embedded && item.acquiredLevel && item.acquiredLevel !== String(item.level) && <><br />{<TermDisplay>{item.acquiredLevel}</TermDisplay>}<TermDisplay>{"级获得"}</TermDisplay></>}</span></CardHeader>
        {item.flavor && <div className="flavor"><RichText text={item.flavor} /></div>}
        {item.keywords && <div className="stat-row"><span><strong><TermDisplay>{"关键词："}</TermDisplay></strong>{<TermDisplay>{item.keywords}</TermDisplay>}</span></div>}
        {(item.action || item.range) && <div className="stat-row"><span><span className={`act-badge ${action?.c ?? 'act-free'}`}>{<TermDisplay>{name('action', item.action, item.actionLabel ?? action?.t ?? item.action)}</TermDisplay>}</span>{<TermDisplay>{item.range}</TermDisplay>}</span></div>}
        {item.trigger && <div className="indent-block"><strong><TermDisplay>{"触发："}</TermDisplay></strong><RichText text={item.trigger} /></div>}
        {item.target && <div className="indent-block"><strong><TermDisplay>{"目标："}</TermDisplay></strong><RichText text={item.target} /></div>}
        {item.att && <div className="indent-block"><strong><TermDisplay>{"攻击："}</TermDisplay></strong>{<TermDisplay>{item.att}</TermDisplay>}{<TermDisplay>{item.def && ` vs. ${name('defense', item.def, item.defLabel ?? Defenses[item.def as keyof typeof Defenses] ?? item.def)}`}</TermDisplay>}</div>}
        {(['hit', 'miss', 'effect', 'sustain', 'special'] as const).map((key, index) => item[key] ? <div className="indent-block" key={key}><strong>{<TermDisplay>{['命中', '失手', '效果', '维持', '特殊'][index]}</TermDisplay>}<TermDisplay>{"："}</TermDisplay></strong><RichText text={item[key]} /></div> : null)}
        {(item.rules ?? []).filter(rule => rule.title || rule.text).map(rule => <section className="progression-body" key={rule.id}>
            {rule.title && <strong>{<TermDisplay>{rule.title}</TermDisplay>}</strong>}<div><RichText text={rule.text} /></div>
        </section>)}
        {item.source && <div className="progression-source"><TermDisplay>{"来源 / 参考："}</TermDisplay>{item.source}</div>}
    </div>;
}

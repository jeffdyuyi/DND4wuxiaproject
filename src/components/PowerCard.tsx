import { CardHeader } from './CardHeader';
import type { MoveItem } from '../types';
import { ActionMap, Defenses, UsageOptions } from '../constants';
import { RichText } from './RichText';

export function PowerCard({ item, embedded = false }: { item: MoveItem; embedded?: boolean }) {
    const action = ActionMap[item.action as keyof typeof ActionMap];
    const frequency = item.typeLabel ?? UsageOptions.find(option => option.v === item.type)?.t ?? item.type;
    return <div className={embedded ? 'progression-power' : 'wuxia-card'}>
        <CardHeader module={'moves'} item={item}><span className={embedded ? '' : 'card-title'}>{item.name || '未命名威能'}</span>
            <span className="card-meta">{!embedded && item.cls && `${item.cls} · `}{frequency} {item.level}级{embedded && item.acquiredLevel && item.acquiredLevel !== String(item.level) && <><br />{item.acquiredLevel}级获得</>}</span></CardHeader>
        {item.flavor && <div className="flavor"><RichText text={item.flavor} /></div>}
        {item.keywords && <div className="stat-row"><span><strong>关键词：</strong>{item.keywords}</span></div>}
        {(item.action || item.range) && <div className="stat-row"><span><span className={`act-badge ${action?.c ?? 'act-free'}`}>{item.actionLabel ?? action?.t ?? item.action}</span>{item.range}</span></div>}
        {item.trigger && <div className="indent-block"><strong>触发：</strong><RichText text={item.trigger} /></div>}
        {item.target && <div className="indent-block"><strong>目标：</strong><RichText text={item.target} /></div>}
        {item.att && <div className="indent-block"><strong>攻击：</strong>{item.att}{item.def && ` vs. ${item.defLabel ?? Defenses[item.def as keyof typeof Defenses] ?? item.def}`}</div>}
        {(['hit', 'miss', 'effect', 'sustain', 'special'] as const).map((key, index) => item[key] ? <div className="indent-block" key={key}><strong>{['命中', '失手', '效果', '维持', '特殊'][index]}：</strong><RichText text={item[key]} /></div> : null)}
        {(item.rules ?? []).filter(rule => rule.title || rule.text).map(rule => <section className="progression-body" key={rule.id}>
            {rule.title && <strong>{rule.title}</strong>}<div><RichText text={rule.text} /></div>
        </section>)}
        {item.source && <div className="progression-source">来源 / 参考：{item.source}</div>}
    </div>;
}

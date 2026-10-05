import { TermDisplay } from './TermDisplay';
import { HeaderColorEditor } from './HeaderColorEditor';
import { CardHeader } from './CardHeader';
import { newPower } from '../utils/progression';
import { moveEntry } from '../utils/reorder';
import type { ProgressionItem } from '../types';
import { Input, Text } from './FormHelpers';
import { PowerEditor } from './PowerEditor';
import { PowerCard } from './PowerCard';
import { RichText } from './RichText';
import { TemplateReference } from './TemplateReference';
type ProgressionModule = 'traditions' | 'paths';
const titleOf = (module: ProgressionModule) => module === 'traditions' ? '修行传承' : '成道之途';

export function ProgressionEditor({ module, item, onChange }: {
    module: ProgressionModule; item: ProgressionItem; onChange: (item: ProgressionItem) => void;
}) {
    const update = <K extends keyof ProgressionItem>(key: K, value: ProgressionItem[K]) => onChange({ ...item, [key]: value });
    const features = item.features ?? [], powers = item.powers ?? [];
    return <div className="editor-panel">
        <TemplateReference item={item} /><h3 className="editor-section-title">基础信息</h3><HeaderColorEditor module={module} item={item} onChange={next => onChange(next as ProgressionItem)} />
        <Input label={`${titleOf(module)}名称`} value={item.name} onChange={value => update('name', value)} />
        <Text label="引言 / 意境" value={item.flavor} onChange={value => update('flavor', value)} />
        <Input label="起始等级" value={item.entryLevel} onChange={value => update('entryLevel', value)} />
        <Text label="前提条件" value={item.req} onChange={value => update('req', value)} />
        <Text label="资源说明" value={item.description} onChange={value => update('description', value)} />
        <Input label="来源 / 原版参考" value={item.source} onChange={value => update('source', value)} />
        <p className="progression-hint"><TermDisplay>{"默认节点参考 4E；等级、数量与内容均可修改。附属威能随本资源一起保存和导出。"}</TermDisplay></p>
        <h3><TermDisplay>{"分级特性"}</TermDisplay></h3>
        {features.map((feature, index) => <details className="editor-group" key={feature.id} open>
            <summary>{<TermDisplay>{feature.level}</TermDisplay>}<TermDisplay>{"级 · "}</TermDisplay>{<TermDisplay>{feature.name || `特性 ${index + 1}`}</TermDisplay>}</summary>
            <Input label="获得等级" value={feature.level} onChange={value => update('features', features.map(f => f.id === feature.id ? { ...f, level: value } : f))} />
            <Input label="特性名称" value={feature.name} onChange={value => update('features', features.map(f => f.id === feature.id ? { ...f, name: value } : f))} />
            <Text label="规则效果（包括行动点特性）" value={feature.desc} onChange={value => update('features', features.map(f => f.id === feature.id ? { ...f, desc: value } : f))} />
            <div className="toolbar"><button className="btn" disabled={index === 0} onClick={() => update('features', moveEntry(features, index, -1))}><TermDisplay>{"上移"}</TermDisplay></button>
                <button className="btn" disabled={index === features.length - 1} onClick={() => update('features', moveEntry(features, index, 1))}><TermDisplay>{"下移"}</TermDisplay></button>
                <button className="btn" onClick={() => update('features', features.filter(f => f.id !== feature.id))}><TermDisplay>{"删除特性"}</TermDisplay></button></div>
        </details>)}
        <button className="btn" onClick={() => update('features', [...features, { id: crypto.randomUUID(), level: item.entryLevel, name: '', desc: '' }])}><TermDisplay>{"+ 添加特性"}</TermDisplay></button>
        <h3><TermDisplay>{"附属威能"}</TermDisplay></h3>
        {powers.map((power, index) => <details className="editor-group" key={power.id}>
            <summary>{<TermDisplay>{power.acquiredLevel || power.level}</TermDisplay>}<TermDisplay>{"级获得 · "}</TermDisplay>{<TermDisplay>{power.name || `威能 ${index + 1}`}</TermDisplay>}</summary>
            <PowerEditor embedded item={power} onChange={next => update('powers', powers.map(current => current.id === power.id ? next : current))} />
            <div className="toolbar"><button className="btn" disabled={index === 0} onClick={() => update('powers', moveEntry(powers, index, -1))}><TermDisplay>{"上移"}</TermDisplay></button>
                <button className="btn" disabled={index === powers.length - 1} onClick={() => update('powers', moveEntry(powers, index, 1))}><TermDisplay>{"下移"}</TermDisplay></button>
                <button className="btn" onClick={() => update('powers', powers.filter(p => p.id !== power.id))}><TermDisplay>{"删除威能"}</TermDisplay></button></div>
        </details>)}
        <button className="btn" onClick={() => update('powers', [...powers, { ...newPower(Number(item.entryLevel) || 1, 'special'), acquiredLevel: item.entryLevel }])}><TermDisplay>{"+ 添加威能"}</TermDisplay></button>
        {module === 'paths' && <details className="editor-group" open>
            <summary><TermDisplay>{"终局描述（可选）"}</TermDisplay></summary>
            <Input label="终局标题" value={item.culminationTitle} onChange={value => update('culminationTitle', value)} />
            <Text label="终局 / 不朽说明" value={item.culmination} onChange={value => update('culmination', value)} />
        </details>}
        <details className="editor-group"><summary><TermDisplay>{"原版全文 / 未拆分内容（不印在卡片上）"}</TermDisplay></summary>
            <Text label="原版全文" value={item.sourceText} onChange={value => update('sourceText', value)} />
        </details>
    </div>;
}
export function ProgressionCard({ module, item, summaryOnly = false }: { module: ProgressionModule; item: ProgressionItem; summaryOnly?: boolean }) {
    const features = (item.features ?? []).filter(f => f.name || f.desc);
    const powers = (item.powers ?? []).filter(p => p.name || p.flavor || p.hit || p.miss || p.effect || p.special || p.rules?.some(rule => rule.title || rule.text));
    return <div className="wuxia-card progression-card">
        <CardHeader module={module} item={item}><span className="card-title">{<TermDisplay>{item.name}</TermDisplay>}</span>
            <span className="card-meta">{<TermDisplay>{titleOf(module)}</TermDisplay>}{item.entryLevel && <><br />{<TermDisplay>{item.entryLevel}</TermDisplay>}<TermDisplay>{"级起"}</TermDisplay></>}</span></CardHeader>
        {item.flavor && <div className="flavor"><RichText text={item.flavor} /></div>}
        {item.req && <div className="stat-row"><div><strong><TermDisplay>{"前提条件："}</TermDisplay></strong><RichText text={item.req} /></div></div>}
        {item.description && <div className="progression-body"><RichText text={item.description} /></div>}
        {features.length > 0 && <><h3 className="progression-heading">{<TermDisplay>{module === 'traditions' ? '传承特性' : '成道特性'}</TermDisplay>}</h3>{features.map(feature => <section key={feature.id} className="progression-body">
            <strong>{<TermDisplay>{feature.name || '未命名特性'}</TermDisplay>}{<TermDisplay>{feature.level && `（${feature.level}级）`}</TermDisplay>}</strong><div><RichText text={feature.desc} /></div>
        </section>)}</>}
        {powers.length > 0 && <><h3 className="progression-heading"><TermDisplay>{"附属威能"}</TermDisplay></h3>{summaryOnly
            ? powers.map(power => <div className="progression-body" key={power.id}>{<TermDisplay>{power.acquiredLevel || power.level}</TermDisplay>}<TermDisplay>{"级："}</TermDisplay>{<TermDisplay>{power.name || '未命名威能'}</TermDisplay>}</div>)
            : powers.map(power => <PowerCard embedded item={power} key={power.id} />)}</>}
        {module === 'paths' && item.culmination && <><h3 className="progression-heading">{<TermDisplay>{item.culminationTitle || '终局 / 不朽'}</TermDisplay>}</h3><div className="progression-body"><RichText text={item.culmination} /></div></>}
        {item.source && <div className="progression-source"><TermDisplay>{"来源 / 参考："}</TermDisplay>{item.source}</div>}
    </div>;
}

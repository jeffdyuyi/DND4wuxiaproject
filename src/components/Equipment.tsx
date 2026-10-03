import type { EquipmentItem, EquipmentVersion } from '../types';
import { Input, Text } from './FormHelpers';
import { TermInput, RuleText } from './TermControls';
import { TermDisplay } from './TermDisplay';
import { TemplateReference } from './TemplateReference';
import { HeaderColorEditor } from './HeaderColorEditor';
import { PowerEditor } from './PowerEditor';
import { PowerCard } from './PowerCard';
import { CardHeader } from './CardHeader';
import { RichText } from './RichText';
import { newPower } from '../utils/progression';
import { moveEntry } from '../utils/reorder';
import { applyEquipmentVersion } from '../utils/equipment';

export function EquipmentEditor({ item, onChange }: { item: EquipmentItem; onChange: (item: EquipmentItem) => void }) {
    const versions = item.versions ?? [], powers = item.powers ?? [];
    const update = <K extends keyof EquipmentItem>(key: K, value: EquipmentItem[K]) => onChange({ ...item, [key]: value, ...(['level', 'price', 'enhance', 'crit'].includes(String(key)) ? { selectedVersionId: undefined } : {}) });
    const updateVersion = (id: string, values: Partial<EquipmentVersion>) => onChange({
        ...item,
        versions: versions.map(version => version.id === id ? { ...version, ...values } : version),
        selectedVersionId: item.selectedVersionId === id ? undefined : item.selectedVersionId,
    });
    const level = (value: string) => { const result = Number(value); return Number.isSafeInteger(result) && result >= 0 ? result : undefined; };
    return <div className="editor-panel">
        <TemplateReference item={item} /><HeaderColorEditor module="items" item={item} onChange={next => onChange(next as EquipmentItem)} />
        <h3 className="editor-section-title">基础信息</h3>
        <Input label="宝物名称" value={item.name} onChange={value => update('name', value)} />
        <Input label="当前等级" value={item.level} onChange={value => { const next = level(value); if (next !== undefined) update('level', next); }} />
        <TermInput label="装备部位" value={item.slot} categories={['slot']} onChange={value => update('slot', value)} />
        <Input label="当前价值" value={item.price} onChange={value => update('price', value)} />
        <TermInput label="类型 (如：重刃)" value={item.type} categories={['weaponGroup', 'weapon', 'implement', 'armor']} collectAs="weaponGroup" onChange={value => update('type', value)} />
        <Text label="外观" value={item.flavor} onChange={value => update('flavor', value)} />
        <Input label="当前淬炼加值／作用对象" value={item.enhance} onChange={value => update('enhance', value)} />
        <Input label="当前暴击效果" value={item.crit} onChange={value => update('crit', value)} />
        <Input label="来源／原版参考" value={item.source} onChange={value => update('source', value)} />
        <section data-review="versions">
            <h3 className="editor-section-title">等级版本</h3>
            <p className="progression-hint">应用版本会填入当前等级、价值、淬炼与暴击字段；特性和附属威能保持独立。</p>
            {versions.map(version => <details className="editor-group" key={version.id}>
                <summary>{version.level} 级 · {version.price || '价值待填写'}{version.id === item.selectedVersionId ? ' · 已应用' : ''}</summary>
                <Input label="版本等级" value={version.level} onChange={value => { const next = level(value); if (next !== undefined) updateVersion(version.id, { level: next }); }} />
                <Input label="版本价值" value={version.price} onChange={value => updateVersion(version.id, { price: value })} />
                <Input label="版本淬炼加值／作用对象" value={version.enhance} onChange={value => updateVersion(version.id, { enhance: value })} />
                <Text label="版本暴击效果" value={version.crit} onChange={value => updateVersion(version.id, { crit: value })} />
                <div className="toolbar"><button type="button" className="btn" onClick={() => onChange(applyEquipmentVersion(item, version))}>应用此版本</button>
                    <button type="button" className="btn" onClick={() => onChange({ ...item, versions: versions.filter(row => row.id !== version.id), selectedVersionId: item.selectedVersionId === version.id ? undefined : item.selectedVersionId })}>移除版本</button></div>
            </details>)}
            <button type="button" className="btn" onClick={() => update('versions', [...versions, { id: crypto.randomUUID(), level: item.level, price: item.price, enhance: item.enhance, crit: item.crit }])}>+ 添加版本</button>
        </section>
        <h3 className="editor-section-title">规则与效果</h3>
        <RuleText label="特性 (Property)" value={item.prop} onChange={value => update('prop', value)} />
        <RuleText label="神通正文（兼容旧卡／未拆分内容）" value={item.power} onChange={value => update('power', value)} />
        <section data-review="powers"><h3 className="editor-section-title">附属威能</h3>
            {powers.map((power, index) => <details className="editor-group" key={power.id}>
                <summary>{power.name || `威能 ${index + 1}`}</summary>
                <PowerEditor embedded item={power} onChange={next => update('powers', powers.map(row => row.id === power.id ? next : row))} />
                <div className="toolbar"><button type="button" className="btn" disabled={!index} onClick={() => update('powers', moveEntry(powers, index, -1))}>上移</button>
                    <button type="button" className="btn" disabled={index === powers.length - 1} onClick={() => update('powers', moveEntry(powers, index, 1))}>下移</button>
                    <button type="button" className="btn" onClick={() => update('powers', powers.filter(row => row.id !== power.id))}>移除威能</button></div>
            </details>)}
            <button type="button" className="btn" onClick={() => update('powers', [...powers, newPower(0, 'special')])}>+ 添加威能</button>
        </section>
    </div>;
}

export function EquipmentCard({ item, summaryOnly = false }: { item: EquipmentItem; summaryOnly?: boolean }) {
    const powers = (item.powers ?? []).filter(power => power.name || power.flavor || power.trigger || power.target || power.att || power.hit || power.miss || power.effect || power.sustain || power.special || power.rules?.some(rule => rule.text));
    return <div className="wuxia-card equipment-card">
        <CardHeader item={item} module="items"><span className="card-title"><TermDisplay>{item.name}</TermDisplay></span><span className="card-meta">等级 {item.level}</span></CardHeader>
        {item.flavor && <div className="flavor"><TermDisplay>{item.flavor}</TermDisplay></div>}
        {(item.slot || item.price) && <div className="stat-row"><TermDisplay>{[item.slot, item.price].filter(Boolean).join(' · ')}</TermDisplay></div>}
        {item.type && <div className="stat-row"><span className="label">兵甲类型：</span><TermDisplay>{item.type}</TermDisplay></div>}
        {item.enhance && <div className="stat-row"><span className="label">淬炼：</span><TermDisplay>{item.enhance}</TermDisplay></div>}
        {item.crit && <div className="stat-row"><span className="label">暴击：</span><RichText text={item.crit} /></div>}
        {!!item.versions?.length && <table className="equipment-versions"><thead><tr><th>等级</th><th>价值</th><th>淬炼</th><th>暴击</th></tr></thead><tbody>{item.versions.map(version => <tr key={version.id}><td>{version.level}</td><td><TermDisplay>{version.price}</TermDisplay></td><td><TermDisplay>{version.enhance}</TermDisplay></td><td><RichText text={version.crit} /></td></tr>)}</tbody></table>}
        {item.prop && <div className="indent-block"><span className="label">特性：</span><RichText text={item.prop} /></div>}
        {item.power && <div className="indent-block"><span className="label">神通：</span><RichText text={item.power} /></div>}
        {summaryOnly ? powers.map(power => <div key={power.id} className="stat-row"><TermDisplay>{power.name}</TermDisplay></div>) : powers.map(power => <div className="embedded-power" key={power.id}><PowerCard item={power} /></div>)}
        {item.source && <div className="source-line">来源：{item.source}</div>}
    </div>;
}


import React, { useRef } from 'react';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import type { ModuleType } from '../constants';
import { Config, ActionMap, Defenses } from '../constants';
import type { Item, MoveItem, EquipmentItem, GeneralItem, SchoolItem, RootItem, OriginItem, DestinyItem } from '../types';

interface PreviewProps {
    module: ModuleType;
    item: Item | null;
}

export const Preview: React.FC<PreviewProps> = ({ module, item }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    if (!item) return <div className="preview-panel"></div>;

    const exportImage = async (copy = false) => {
        if (!cardRef.current) return;
        const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null });
        if (copy) {
            canvas.toBlob(blob => {
                if (blob) {
                    navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
                        .then(() => alert("复制成功"))
                        .catch(() => alert("复制失败"));
                }
            });
        } else {
            const link = document.createElement('a');
            link.download = `${item.name}.png`;
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const md = (text?: string) => {
        if (!text) return null;
        const html = marked.parseInline(text) as string;
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    let content;

    if (module === 'moves') {
        const d = item as MoveItem;


        const typeInfo = {
            basic: { t: '外家功夫', c: 'bg-green' },
            special: { t: '催动内息', c: 'bg-red' },
            ultimate: { t: '凝神绝技', c: 'bg-black' }
        }[d.type] || { t: '未知', c: 'bg-green' };

        const action = ActionMap[d.action as keyof typeof ActionMap] || { t: '', c: '' };
        // Defenses
        const defLabel = Defenses[d.def as keyof typeof Defenses] || '';
        const attackText = (d.att && d.def) ? `${d.att} vs. ${defLabel}` : "";

        content = (
            <div className={`wuxia-card`}>
                <div className={`card-header ${typeInfo.c}`}>
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">{d.cls} {typeInfo.t} {d.level}</span>
                </div>
                <div className="flavor">{d.flavor}</div>
                <div className="stat-row"><span><span className="label">功法属性：</span>{d.keywords}</span></div>
                <div className="stat-row">
                    <span>
                        <span className={`act-badge ${action.c}`}>{action.t}</span>
                        <span className="label">范围：</span>{d.range}
                    </span>
                </div>
                {d.trigger && <div className="stat-row"><span><span className="label">触发：</span>{md(d.trigger)}</span></div>}
                {d.target && <div className="stat-row"><span><span className="label">目标：</span>{md(d.target)}</span></div>}
                {attackText && <div className="stat-row"><span><span className="label">较量：</span>{attackText}</span></div>}
                {d.hit && <div className="indent-block"><span className="lbl-hit">命中：</span>{md(d.hit)}</div>}
                {d.miss && <div className="indent-block"><span className="lbl-miss">失手：</span>{md(d.miss)}</div>}
                {d.effect && <div className="indent-block"><span className="lbl-effect">效果：</span>{md(d.effect)}</div>}
                {d.sustain && <div className="indent-block"><span className="label">维持：</span>{md(d.sustain)}</div>}
                {d.special && <div className="indent-block"><span className="label">特殊：</span>{md(d.special)}</div>}
            </div>
        );
    } else if (module === 'items') {
        const d = item as EquipmentItem;
        content = (
            <div className="wuxia-card">
                <div className="card-header bg-gold">
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">等级 {d.level}</span>
                </div>
                <div className="flavor">{d.flavor}</div>
                <div className="stat-row" style={{ justifyContent: 'space-between' }}>
                    <span>{d.slot}</span><span>{d.price}</span>
                </div>
                <div className="stat-row"><span><span className="label">兵甲类型：</span>{d.type}</span></div>
                <div className="stat-row"><span><span className="label">淬炼：</span>{d.enhance}</span></div>
                <div className="stat-row"><span><span className="label">暴击：</span>{d.crit}</span></div>
                {d.prop && <div className="indent-block" style={{ borderTop: '1px dashed #ccc', marginTop: '5px' }}>
                    <span className="label">特性：</span>{md(d.prop)}
                </div>}
                {d.power && <div className="indent-block" style={{ borderTop: '1px dashed #ccc', marginTop: '5px' }}>
                    <span className="label">神通：</span>{md(d.power)}
                </div>}
            </div>
        );

    } else if (module === 'schools') {
        const d = item as SchoolItem;
        content = (
            <div className="wuxia-card">
                <div className="card-header bg-red">
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">武林门派</span>
                </div>
                <div className="flavor" style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '8px' }}>
                    {md(d.description)}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong>生命值</strong></span>
                </div>
                <div className="indent-block">
                    1级生命值：{d.hpStart}<br />
                    每级增加：{d.hpPerLvl}<br />
                    每日自疗：{d.surges}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong>擅长</strong></span>
                </div>
                <div className="indent-block">
                    护甲：{d.armorProf}<br />
                    兵器：{d.weaponProf}<br />
                    防御加值：{d.defBonus}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong>受训技能</strong></span>
                </div>
                <div className="indent-block">{md(d.trainedSkills)}</div>

                {(d.features || []).length > 0 && (
                    <div style={{ marginTop: '15px', borderTop: '2px solid #ccc', paddingTop: '10px' }}>
                        <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '10px', color: '#c0392b' }}>门派特技</div>
                        {d.features.map((f: { name: string; desc: string }, i: number) => (
                            <div key={i} style={{ marginBottom: '12px' }}>
                                <div style={{ fontWeight: 'bold' }}>{f.name}:</div>
                                <div className="indent-block">{md(f.desc)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    } else if (module === 'roots') {
        const d = item as RootItem;
        content = (
            <div className="wuxia-card">
                <div className="card-header bg-gray">
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">根骨天赋</span>
                </div>
                {/* Image 1 layout approximation */}
                <div style={{ padding: '10px', background: '#eaeaea', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                    {d.attributes && <div><strong>属性值：</strong> {d.attributes}</div>}
                    {d.size && <div><strong>体型：</strong> {d.size}</div>}
                    {d.speed && <div><strong>速度：</strong> {d.speed}</div>}
                    {d.vision && <div><strong>视觉：</strong> {d.vision}</div>}
                </div>
                <div className="flavor">{d.flavor}</div>
            </div>
        );
    } else if (module === 'origins') {
        const d = item as OriginItem;
        content = (
            <div className="wuxia-card">
                <div className="card-header bg-gray">
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">江湖出身</span>
                </div>
                <div className="flavor">{d.flavor}</div>

                <div className="stat-row"><span><span className="label">语言：</span>{d.languages}</span></div>
                <div className="stat-row"><span><span className="label">技能加值：</span>{d.skillBonuses}</span></div>

                {(d.traits || []).length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px dashed #ccc', paddingTop: '5px' }}>
                        {d.traits.map((t: { name: string; desc: string }, i: number) => (
                            <div key={i} style={{ marginBottom: '8px' }}>
                                <span className="label">{t.name}：</span>
                                <span>{md(t.desc)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    } else if (module === 'destinies') {
        const d = item as DestinyItem;
        // Similar to a Move card (Encounter Power layout usually)
        // Image 2 doesn't show power, but implies "Racial Power".
        // Use red header usually if Encounter, but let's stick to Gray or maybe a special color.
        // Or determine color based on Power Type if I parsed it.
        // Let's use standard Gray for Destiny, or maybe something special.
        // Reference says "Substitute for Racial Powers".
        // Racial powers are usually Encounter.
        // Let's use Red if type contains "遭遇" or "Encounter", else maybe Green.
        // Safest is Gray or Red. Let's use 'bg-red' as it's likely an encounter power.
        const headerClass = (d.powerType?.includes('遭遇') || d.powerType?.includes('Encounter')) ? 'bg-red' : 'bg-gray';

        const action = ActionMap[d.action as keyof typeof ActionMap] || { t: d.action || '', c: '' };

        content = (
            <div className="wuxia-card">
                <div className={`card-header ${headerClass}`}>
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">先天命格 / {d.powerType || '特殊'}</span>
                </div>
                <div className="flavor">{d.flavor}</div>
                <div className="stat-row">
                    <span>
                        {action.t && <span className={`act-badge ${action.c}`}>{action.t}</span>}
                        {d.range && <span><span className="label">范围：</span>{d.range}</span>}
                    </span>
                </div>
                {d.target && <div className="stat-row"><span><span className="label">目标：</span>{md(d.target)}</span></div>}
                {d.effect && <div className="indent-block"><span className="lbl-effect">效果：</span>{md(d.effect)}</div>}
            </div>
        );

    } else {
        const d = item as GeneralItem;
        let color = module === 'feats' ? 'bg-gray' : 'bg-green';
        let meta = Config[module].title.slice(0, 4);
        if (module === 'feats') meta = d.tier || '';

        content = (
            <div className="wuxia-card">
                <div className={`card-header ${color}`}>
                    <span className="card-title">{d.name}</span>
                    <span className="card-meta">{meta}</span>
                </div>
                <div className="flavor">{d.flavor}</div>
                {d.stats && <div className="stat-row"><span><span className="label">属性加成：</span>{d.stats}</span></div>}
                {d.traits && <div className="stat-row"><span><span className="label">特征：</span>{d.traits}</span></div>}
                {d.skills && <div className="stat-row"><span><span className="label">相关技艺：</span>{d.skills}</span></div>}
                {d.req && <div className="stat-row"><span><span className="label">修炼门槛：</span>{d.req}</span></div>}
                {d.powerName && <div className="stat-row" style={{ borderTop: '1px dashed #ccc', marginTop: '5px', paddingTop: '5px' }}>
                    <span className="label">{d.powerName}</span>
                </div>}
                {d.powerDesc && <div className="indent-block">{md(d.powerDesc)}</div>}
                {d.benefit && <div className="indent-block" style={{ whiteSpace: 'pre-wrap' }}>{md(d.benefit)}</div>}
            </div>
        );
    }

    return (
        <div className="preview-panel">
            <div className="toolbar">
                <button className="btn btn-primary" onClick={() => exportImage(true)}>复制图片</button>
                <button className="btn" onClick={() => exportImage(false)}>下载 PNG</button>
            </div>
            <div ref={cardRef}>
                {content}
            </div>
        </div>
    );
};

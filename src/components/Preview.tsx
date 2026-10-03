
import React, { useRef, useState } from 'react';
import { RichText } from './RichText';
import { PowerCard } from './PowerCard';
import type { ModuleType } from '../constants';
import { Config, ActionMap } from '../constants';
import { ProgressionCard } from './Progression';
import { resolveCardFormat } from '../utils/card-format';
import type { ProgressionItem } from '../types';
import type { Item, MoveItem, EquipmentItem, GeneralItem, SchoolItem, RootItem, OriginItem, DestinyItem } from '../types';
import { captureCard, cardArchive } from '../utils/card-image';
import { downloadJSON } from '../utils/archive';

interface PreviewProps {
    module: ModuleType;
    item: Item | null;
}

export const Preview: React.FC<PreviewProps> = ({ module, item }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [format, setFormat] = useState('full');
    const [scale, setScale] = useState(1);
    const [exporting, setExporting] = useState(false);
    const [feedback, setFeedback] = useState('');

    if (!item) return <div className="preview-panel"></div>;

    const isProgression = module === 'traditions' || module === 'paths';
    const powers = isProgression ? (item as ProgressionItem).powers : [];
    const selectedFormat = isProgression ? resolveCardFormat(format, powers) : 'full';

    const exportImage = async (copy = false) => {
        const card = cardRef.current;
        if (!card) return;
        setExporting(true); setFeedback('');
        try {
            const blob = await captureCard(card, cardArchive(module, item, selectedFormat));
            if (copy) {
                if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('此浏览器不支持复制图片，请下载 PNG');
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                setFeedback('图片已复制供展示；需要重新编辑时请保留下载的 PNG 或 JSON。');
            } else {
                const url = URL.createObjectURL(blob), link = document.createElement('a');
                link.download = `${item.name.replace(/[<>:"/\\|?*]/g, '_') || '吾侠资源'}_${selectedFormat.replace(':', '_')}.png`;
                link.href = url; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
                setFeedback('可编辑 PNG 已下载，可通过导入卡片恢复数据。');
            }
        } catch (error) { setFeedback(`导出失败：${error instanceof Error ? error.message : '请尝试概要卡或单张威能卡'}`); }
        finally { setExporting(false); }
    };

    const content = <CardContent module={module} item={item} format={selectedFormat} />;

    return (
        <div className="preview-panel">
            <div className="toolbar">
                {isProgression && <select aria-label="卡片导出格式" value={selectedFormat} onChange={event => setFormat(event.target.value)}>
                    <option value="full">完整资源卡</option><option value="summary">概要卡</option>
                    {powers?.map((power, index) => <option key={power.id} value={`power:${power.id}`}>威能：{power.name || `第 ${index + 1} 张`}</option>)}
                </select>}
                <label>预览 <select aria-label="预览缩放" value={scale} onChange={event => setScale(Number(event.target.value))}>
                    <option value={0.6}>60%</option><option value={0.8}>80%</option><option value={1}>100%</option>
                </select></label>
                <button className="btn btn-primary" disabled={exporting} onClick={() => void exportImage(true)}>复制图片</button>
                <button className="btn" disabled={exporting} onClick={() => void exportImage(false)}>{exporting ? '生成中…' : '下载 PNG'}</button>
                <button className="btn" disabled={exporting} onClick={() => downloadJSON(cardArchive(module, item, selectedFormat), `${item.name || '吾侠卡片'}.json`)}>下载单卡 JSON</button>
            </div>
            {feedback && <p role="status" className="export-feedback">{feedback}</p>}
            <div className="preview-stage" data-preview-scale style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}><div ref={cardRef}>{content}</div></div>
        </div>
    );
};

export function CardContent({ module, item, format = "full" }: { module: ModuleType; item: Item; format?: string }) {
    const powers = module === "traditions" || module === "paths" ? (item as ProgressionItem).powers : [];
    const selectedFormat = resolveCardFormat(format, powers);
    const md = (text?: string) => <RichText text={text} />;

    let content;

    if (module === 'traditions' || module === 'paths') {
        const progression = item as ProgressionItem;
        const power = powers?.find(power => `power:${power.id}` === selectedFormat);
        content = power ? <PowerCard item={power} /> : <ProgressionCard module={module} item={progression} summaryOnly={selectedFormat === 'summary'} />;
    } else if (module === 'moves') {
        content = <PowerCard item={item as MoveItem} />;
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
                        {d.features.map((f) => (
                            <div key={f.id} style={{ marginBottom: '12px' }}>
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
                        {d.traits.map((t) => (
                            <div key={t.id} style={{ marginBottom: '8px' }}>
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
                        {action.t && <span className={`act-badge ${action.c}`}>{d.actionLabel ?? action.t}</span>}
                        {d.range && <span><span className="label">范围：</span>{d.range}</span>}
                    </span>
                </div>
                {d.target && <div className="stat-row"><span><span className="label">目标：</span>{md(d.target)}</span></div>}
                {d.effect && <div className="indent-block"><span className="lbl-effect">效果：</span>{md(d.effect)}</div>}
            </div>
        );

    } else {
        const d = item as GeneralItem;
        const color = module === 'feats' ? 'bg-gray' : 'bg-green';
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


    return content;
}

import { useTerminology } from '../hooks/TerminologyContext';
import { TermDisplay } from './TermDisplay';
import { CardHeader } from './CardHeader';

import React, { useEffect, useRef, useState } from 'react';
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
    const { terminology } = useTerminology();
    const cardRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [format, setFormat] = useState('full');
    const [zoom, setZoom] = useState('auto');
    const [size, setSize] = useState({ width: 420, height: 0 });
    const [exporting, setExporting] = useState(false);
    const [feedback, setFeedback] = useState('');
    useEffect(() => {
        const panel = panelRef.current, card = cardRef.current;
        if (!panel || !card) return;
        const observer = new ResizeObserver(() => {
            const styles = getComputedStyle(panel);
            const width = panel.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
            if (width > 0) setSize({ width, height: card.offsetHeight + 30 });
        });
        observer.observe(panel); observer.observe(card);
        return () => observer.disconnect();
    }, [item?.id, format]);
    const scale = zoom === 'auto' ? Math.min(1, Math.max(0.2, size.width / 420)) : Number(zoom);

    if (!item) return <div className="preview-panel"></div>;

    const isProgression = module === 'traditions' || module === 'paths';
    const powers = isProgression ? (item as ProgressionItem).powers : [];
    const selectedFormat = isProgression ? resolveCardFormat(format, powers) : 'full';

    const exportImage = async (copy = false) => {
        const card = cardRef.current;
        if (!card) return;
        setExporting(true); setFeedback('');
        try {
            const blob = await captureCard(card, { ...cardArchive(module, item, selectedFormat), terminology });
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
        <div className="preview-panel" ref={panelRef}>
            <div className="toolbar">
                {isProgression && <select aria-label="卡片导出格式" value={selectedFormat} onChange={event => setFormat(event.target.value)}>
                    <option value="full"><TermDisplay>{"完整资源卡"}</TermDisplay></option><option value="summary"><TermDisplay>{"概要卡"}</TermDisplay></option>
                    {powers?.map((power, index) => <option key={power.id} value={`power:${power.id}`}><TermDisplay>{"威能："}</TermDisplay>{<TermDisplay>{power.name || `第 ${index + 1} 张`}</TermDisplay>}</option>)}
                </select>}
                <label><TermDisplay>{"预览 "}</TermDisplay><select aria-label="预览缩放" value={zoom} onChange={event => setZoom(event.target.value)}>
                    <option value="auto"><TermDisplay>{"适应宽度"}</TermDisplay></option><option value="0.6"><TermDisplay>{"60%"}</TermDisplay></option><option value="0.8"><TermDisplay>{"80%"}</TermDisplay></option><option value="1"><TermDisplay>{"原尺寸"}</TermDisplay></option><option value="1.2"><TermDisplay>{"120%"}</TermDisplay></option>
                </select></label>
                <button className="btn btn-primary" disabled={exporting} onClick={() => void exportImage(true)}><TermDisplay>{"复制图片"}</TermDisplay></button>
                <button className="btn" disabled={exporting} onClick={() => void exportImage(false)}>{<TermDisplay>{exporting ? '生成中…' : '下载 PNG'}</TermDisplay>}</button>
                <button className="btn" disabled={exporting} onClick={() => downloadJSON(cardArchive(module, item, selectedFormat), `${item.name || '吾侠卡片'}.json`)}><TermDisplay>{"下载单卡 JSON"}</TermDisplay></button>
            </div>
            {feedback && <p role="status" className="export-feedback">{<TermDisplay>{feedback}</TermDisplay>}</p>}
            <div className="preview-viewport" style={{ width: 420 * scale, height: size.height ? size.height * scale : undefined }}><div className="preview-stage" data-preview-scale style={{ width: 420, transform: `scale(${scale})`, transformOrigin: 'top left' }}><div ref={cardRef}>{<TermDisplay>{content}</TermDisplay>}</div></div></div>
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
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta"><TermDisplay>{"等级 "}</TermDisplay>{<TermDisplay>{d.level}</TermDisplay>}</span>
                </CardHeader>
                <div className="flavor">{<TermDisplay>{d.flavor}</TermDisplay>}</div>
                <div className="stat-row" style={{ justifyContent: 'space-between' }}>
                    <span>{<TermDisplay>{d.slot}</TermDisplay>}</span><span>{<TermDisplay>{d.price}</TermDisplay>}</span>
                </div>
                <div className="stat-row"><span><span className="label"><TermDisplay>{"兵甲类型："}</TermDisplay></span>{<TermDisplay>{d.type}</TermDisplay>}</span></div>
                <div className="stat-row"><span><span className="label"><TermDisplay>{"淬炼："}</TermDisplay></span>{<TermDisplay>{d.enhance}</TermDisplay>}</span></div>
                <div className="stat-row"><span><span className="label"><TermDisplay>{"暴击："}</TermDisplay></span>{<TermDisplay>{d.crit}</TermDisplay>}</span></div>
                {d.prop && <div className="indent-block" style={{ borderTop: '1px dashed #ccc', marginTop: '5px' }}>
                    <span className="label"><TermDisplay>{"特性："}</TermDisplay></span>{<TermDisplay>{md(d.prop)}</TermDisplay>}
                </div>}
                {d.power && <div className="indent-block" style={{ borderTop: '1px dashed #ccc', marginTop: '5px' }}>
                    <span className="label"><TermDisplay>{"神通："}</TermDisplay></span>{<TermDisplay>{md(d.power)}</TermDisplay>}
                </div>}
            </div>
        );

    } else if (module === 'schools') {
        const d = item as SchoolItem;
        content = (
            <div className="wuxia-card">
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta"><TermDisplay>{"武林门派"}</TermDisplay></span>
                </CardHeader>
                <div className="flavor" style={{ borderBottom: '1px solid #ccc', paddingBottom: '8px', marginBottom: '8px' }}>
                    {<TermDisplay>{md(d.description)}</TermDisplay>}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong><TermDisplay>{"生命值"}</TermDisplay></strong></span>
                </div>
                <div className="indent-block"><TermDisplay>{"1级生命值："}</TermDisplay>{<TermDisplay>{d.hpStart}</TermDisplay>}<br /><TermDisplay>{"每级增加："}</TermDisplay>{<TermDisplay>{d.hpPerLvl}</TermDisplay>}<br /><TermDisplay>{"每日自疗："}</TermDisplay>{<TermDisplay>{d.surges}</TermDisplay>}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong><TermDisplay>{"擅长"}</TermDisplay></strong></span>
                </div>
                <div className="indent-block"><TermDisplay>{"护甲："}</TermDisplay>{<TermDisplay>{d.armorProf}</TermDisplay>}<br /><TermDisplay>{"兵器："}</TermDisplay>{<TermDisplay>{d.weaponProf}</TermDisplay>}<br /><TermDisplay>{"防御加值："}</TermDisplay>{<TermDisplay>{d.defBonus}</TermDisplay>}
                </div>

                <div className="stat-row" style={{ marginTop: '8px' }}>
                    <span><strong><TermDisplay>{"受训技能"}</TermDisplay></strong></span>
                </div>
                <div className="indent-block">{<TermDisplay>{md(d.trainedSkills)}</TermDisplay>}</div>

                {(d.features || []).length > 0 && (
                    <div style={{ marginTop: '15px', borderTop: '2px solid #ccc', paddingTop: '10px' }}>
                        <div style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '10px', color: '#c0392b' }}><TermDisplay>{"门派特技"}</TermDisplay></div>
                        {d.features.map((f) => (
                            <div key={f.id} style={{ marginBottom: '12px' }}>
                                <div style={{ fontWeight: 'bold' }}>{<TermDisplay>{f.name}</TermDisplay>}<TermDisplay>{":"}</TermDisplay></div>
                                <div className="indent-block">{<TermDisplay>{md(f.desc)}</TermDisplay>}</div>
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
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta"><TermDisplay>{"根骨天赋"}</TermDisplay></span>
                </CardHeader>
                {/* Image 1 layout approximation */}
                <div style={{ padding: '10px', background: '#eaeaea', borderRadius: '4px', marginBottom: '10px', fontSize: '14px' }}>
                    {d.attributes && <div><strong><TermDisplay>{"属性值："}</TermDisplay></strong> {<TermDisplay>{d.attributes}</TermDisplay>}</div>}
                    {d.size && <div><strong><TermDisplay>{"体型："}</TermDisplay></strong> {<TermDisplay>{d.size}</TermDisplay>}</div>}
                    {d.speed && <div><strong><TermDisplay>{"速度："}</TermDisplay></strong> {<TermDisplay>{d.speed}</TermDisplay>}</div>}
                    {d.vision && <div><strong><TermDisplay>{"视觉："}</TermDisplay></strong> {<TermDisplay>{d.vision}</TermDisplay>}</div>}
                </div>
                <div className="flavor">{<TermDisplay>{d.flavor}</TermDisplay>}</div>
            </div>
        );
    } else if (module === 'origins') {
        const d = item as OriginItem;
        content = (
            <div className="wuxia-card">
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta"><TermDisplay>{"江湖出身"}</TermDisplay></span>
                </CardHeader>
                <div className="flavor">{<TermDisplay>{d.flavor}</TermDisplay>}</div>

                <div className="stat-row"><span><span className="label"><TermDisplay>{"语言："}</TermDisplay></span>{<TermDisplay>{d.languages}</TermDisplay>}</span></div>
                <div className="stat-row"><span><span className="label"><TermDisplay>{"技能加值："}</TermDisplay></span>{<TermDisplay>{d.skillBonuses}</TermDisplay>}</span></div>

                {(d.traits || []).length > 0 && (
                    <div style={{ marginTop: '10px', borderTop: '1px dashed #ccc', paddingTop: '5px' }}>
                        {d.traits.map((t) => (
                            <div key={t.id} style={{ marginBottom: '8px' }}>
                                <span className="label">{<TermDisplay>{t.name}</TermDisplay>}<TermDisplay>{"："}</TermDisplay></span>
                                <span>{<TermDisplay>{md(t.desc)}</TermDisplay>}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    } else if (module === 'destinies') {
        const d = item as DestinyItem;

        const action = ActionMap[d.action as keyof typeof ActionMap] || { t: d.action || '', c: '' };

        content = (
            <div className="wuxia-card">
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta"><TermDisplay>{"先天命格 / "}</TermDisplay>{<TermDisplay>{d.powerType || '特殊'}</TermDisplay>}</span>
                </CardHeader>
                <div className="flavor">{<TermDisplay>{d.flavor}</TermDisplay>}</div>
                <div className="stat-row">
                    <span>
                        {action.t && <span className={`act-badge ${action.c}`}>{<TermDisplay>{d.actionLabel ?? action.t}</TermDisplay>}</span>}
                        {d.range && <span><span className="label"><TermDisplay>{"范围："}</TermDisplay></span>{<TermDisplay scope="range">{d.range}</TermDisplay>}</span>}
                    </span>
                </div>
                {d.target && <div className="stat-row"><span><span className="label"><TermDisplay>{"目标："}</TermDisplay></span>{<TermDisplay>{md(d.target)}</TermDisplay>}</span></div>}
                {d.effect && <div className="indent-block"><span className="lbl-effect"><TermDisplay>{"效果："}</TermDisplay></span>{<TermDisplay>{md(d.effect)}</TermDisplay>}</div>}
            </div>
        );

    } else {
        const d = item as GeneralItem;
        let meta = Config[module].title.slice(0, 4);
        if (module === 'feats') meta = d.tier || '';

        content = (
            <div className="wuxia-card">
                <CardHeader module={module} item={item}>
                    <span className="card-title">{<TermDisplay>{d.name}</TermDisplay>}</span>
                    <span className="card-meta">{<TermDisplay>{meta}</TermDisplay>}</span>
                </CardHeader>
                <div className="flavor">{<TermDisplay>{d.flavor}</TermDisplay>}</div>
                {d.stats && <div className="stat-row"><span><span className="label"><TermDisplay>{"属性加成："}</TermDisplay></span>{<TermDisplay>{d.stats}</TermDisplay>}</span></div>}
                {d.traits && <div className="stat-row"><span><span className="label"><TermDisplay>{"特征："}</TermDisplay></span>{<TermDisplay>{d.traits}</TermDisplay>}</span></div>}
                {d.skills && <div className="stat-row"><span><span className="label"><TermDisplay>{"相关技艺："}</TermDisplay></span>{<TermDisplay>{d.skills}</TermDisplay>}</span></div>}
                {d.req && <div className="stat-row"><span><span className="label"><TermDisplay>{"修炼门槛："}</TermDisplay></span>{<TermDisplay>{d.req}</TermDisplay>}</span></div>}
                {d.powerName && <div className="stat-row" style={{ borderTop: '1px dashed #ccc', marginTop: '5px', paddingTop: '5px' }}>
                    <span className="label">{<TermDisplay>{d.powerName}</TermDisplay>}</span>
                </div>}
                {d.powerDesc && <div className="indent-block">{<TermDisplay>{md(d.powerDesc)}</TermDisplay>}</div>}
                {d.benefit && <div className="indent-block" style={{ whiteSpace: 'pre-wrap' }}>{<TermDisplay>{md(d.benefit)}</TermDisplay>}</div>}
            </div>
        );
    }


    return content;
}

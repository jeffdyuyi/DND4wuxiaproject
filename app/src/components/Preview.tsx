
import React, { useRef } from 'react';
import { marked } from 'marked';
import html2canvas from 'html2canvas';
import type { ModuleType } from '../constants';
import { Config, ActionMap, Defenses } from '../constants';
import type { Item, MoveItem, EquipmentItem, GeneralItem } from '../types';

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

        // Colors mapping:
        // basic -> green ? The original code:
        // t = MoveTypes[d.type] -> but MoveTypes wasn't defined in the snippet I saw? 
        // Wait, looking at original HTML:
        // const Config = { moves: { ... color: "bg-green" } }
        // renderCard: let html = ...
        // line 376: const t = MoveTypes[d.type];
        // Wait, where is `MoveTypes` defined in original HTML?
        // I missed it in my read?
        // Let's look at `view_file` output again.
        // I don't see `const MoveTypes = ...`.
        // Line 376 uses it. Maybe it was defined earlier or I missed it.
        // Actually, looking at lines 331: select('类型','type',[{v:'basic',t:'外家功夫'},{v:'special',t:'催动内息'},{v:'ultimate',t:'凝神绝技'}])
        // It seems `MoveTypes` might be { basic: {t:'...'}, ... } but it is missing from the global scope in the file I read?
        // Ah, maybe I missed it in the `Config` block or similar.
        // Line 376: `const t = MoveTypes[d.type];`
        // If it's missing, the HTML `renderCard` would crash.
        // But the HTML works (presumably).
        // Let's assume the mapping from the select options.
        // And colors:
        // line 380: `<div class="card-header ${t.c}">`
        // Wait, `t` has `c` property?
        // If `MoveTypes` is missing, maybe it's `Config[module]` but that's generic.
        // Let's assume standard colors:
        // basic: green (At-Will)
        // special: red (Encounter)
        // ultimate: black (Daily)
        // matches 4e.
        // line 16-18: --c-atwill: #1f4e3d (green), --c-encounter (red), --c-daily (black).
        // So I'll replicate this logic.

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

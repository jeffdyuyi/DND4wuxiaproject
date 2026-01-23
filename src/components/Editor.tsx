
import React from 'react';
import type { ModuleType } from '../constants';
import { ActionMap } from '../constants';
import type { Item, MoveItem, EquipmentItem, GeneralItem } from '../types';
import { Input, Text, Select, KeywordSelector, RangeBuilder, AttackBuilder } from './FormHelpers';

interface EditorProps {
    module: ModuleType;
    item: Item | null;
    onChange: (newItem: Item) => void;
}

export const Editor: React.FC<EditorProps> = ({ module, item, onChange }) => {
    if (!item) return <div className="editor-panel">请选择或新建条目</div>;

    const update = (key: string, val: any) => {
        onChange({ ...item, [key]: val });
    };

    if (module === 'moves') {
        const d = item as MoveItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <div className="row">
                        <div className="col"><Input label="招式名称" value={d.name} onChange={(v) => update('name', v)} /></div>
                        <div className="col"><Input label="等级" value={d.level} onChange={(v) => update('level', v)} /></div>
                    </div>
                    <div className="row">
                        <div className="col"><Input label="门派" value={d.cls} onChange={(v) => update('cls', v)} /></div>
                        <div className="col">
                            <Select
                                label="类型"
                                value={d.type}
                                onChange={(v) => update('type', v)}
                                options={[{ v: 'basic', t: '外家功夫' }, { v: 'special', t: '催动内息' }, { v: 'ultimate', t: '凝神绝技' }]}
                            />
                        </div>
                    </div>
                    <KeywordSelector value={d.keywords} onChange={(v) => update('keywords', v)} />
                    <Text label="意境描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <div className="row">
                        <div className="col">
                            <Select label="动作" value={d.action} onChange={(v) => update('action', v)}
                                options={Object.entries(ActionMap).map(([k, v]) => ({ v: k, t: v.t }))}
                            />
                        </div>
                        <div className="col">
                            <RangeBuilder value={d.range} onChange={(v) => update('range', v)} />
                        </div>
                    </div>
                    <Input label="触发 (Trigger)" value={d.trigger} onChange={(v) => update('trigger', v)} />
                    <Input label="目标" value={d.target} onChange={(v) => update('target', v)} />
                    <AttackBuilder att={d.att || ''} def={d.def || ''} onUpdate={(newAtt, newDef) => onChange({ ...item, att: newAtt, def: newDef })} />
                    {/* Note: simultaneous update needs care in React state. I will fix this in logic */}
                    <Text label="命中 (Hit)" value={d.hit} onChange={(v) => update('hit', v)} />
                    <Text label="失手 (Miss)" value={d.miss} onChange={(v) => update('miss', v)} />
                    <Text label="效果 (Effect)" value={d.effect} onChange={(v) => update('effect', v)} />
                    <Input label="维持 (Sustain)" value={d.sustain} onChange={(v) => update('sustain', v)} />
                    <Text label="特殊说明" value={d.special} onChange={(v) => update('special', v)} />
                </form>
            </div>
        );
    } else if (module === 'items') {
        const d = item as EquipmentItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <div className="row">
                        <div className="col"><Input label="宝物名称" value={d.name} onChange={(v) => update('name', v)} /></div>
                        <div className="col"><Input label="等级" value={d.level} onChange={(v) => update('level', v)} /></div>
                    </div>
                    <div className="row">
                        <div className="col"><Input label="部位" value={d.slot} onChange={(v) => update('slot', v)} /></div>
                        <div className="col"><Input label="价值" value={d.price} onChange={(v) => update('price', v)} /></div>
                    </div>
                    <Input label="类型 (如：重刃)" value={d.type} onChange={(v) => update('type', v)} />
                    <Text label="外观" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <Input label="淬炼等级" value={d.enhance} onChange={(v) => update('enhance', v)} />
                    <Input label="暴击效果" value={d.crit} onChange={(v) => update('crit', v)} />
                    <Text label="特性 (Property)" value={d.prop} onChange={(v) => update('prop', v)} />
                    <Text label="神通 (Power)" value={d.power} onChange={(v) => update('power', v)} />
                </form>
            </div>
        );
    } else {
        const d = item as GeneralItem;
        let lbl = module === 'roots' ? '根骨' : (module === 'destinies' ? '命格' : (module === 'origins' ? '出身' : '造诣'));

        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label={lbl + '名称'} value={d.name} onChange={(v) => update('name', v)} />
                    {module === 'feats' && <Input label="层级" value={d.tier} onChange={(v) => update('tier', v)} />}
                    <Text label="描述" value={d.flavor} onChange={(v) => update('flavor', v)} />

                    {module === 'roots' && (
                        <>
                            <Input label="属性加成" value={d.stats} onChange={(v) => update('stats', v)} />
                            <Input label="基础体征" value={d.traits} onChange={(v) => update('traits', v)} />
                            <Input label="天赋绝学" value={d.powerName} onChange={(v) => update('powerName', v)} />
                            <Text label="绝学效果" value={d.powerDesc} onChange={(v) => update('powerDesc', v)} />
                        </>
                    )}
                    {module === 'destinies' && (
                        <>
                            <Input label="命格特性" value={d.traits} onChange={(v) => update('traits', v)} />
                            <Text label="命格被动" value={d.benefit} onChange={(v) => update('benefit', v)} />
                        </>
                    )}
                    {module === 'origins' && (
                        <>
                            <Input label="相关技艺" value={d.skills} onChange={(v) => update('skills', v)} />
                            <Text label="江湖阅历" value={d.benefit} onChange={(v) => update('benefit', v)} />
                        </>
                    )}
                    {module === 'feats' && (
                        <>
                            <Input label="修炼门槛" value={d.req} onChange={(v) => update('req', v)} />
                            <Text label="造诣效果" value={d.benefit} onChange={(v) => update('benefit', v)} />
                        </>
                    )}
                </form>
            </div>
        );
    }
};

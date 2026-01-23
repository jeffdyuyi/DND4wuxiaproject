
import React from 'react';
import type { ModuleType } from '../constants';
import { ActionMap } from '../constants';
import type { Item, MoveItem, EquipmentItem, GeneralItem, SchoolItem, RootItem, OriginItem, DestinyItem } from '../types';
import { Input, Text, Select, KeywordSelector, RangeBuilder, AttackBuilder, TraitListEditor } from './FormHelpers';

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
    } else if (module === 'schools') {
        const d = item as SchoolItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label="门派名称" value={d.name} onChange={(v) => update('name', v)} />
                    <Text label="门派描述 (包含：职能、威能来源、关键属性)" value={d.description} onChange={(v) => update('description', v)} />

                    <div className="row">
                        <div className="col"><Input label="1级生命值" value={d.hpStart} onChange={(v) => update('hpStart', v)} /></div>
                        <div className="col"><Input label="每级增加生命" value={d.hpPerLvl} onChange={(v) => update('hpPerLvl', v)} /></div>
                    </div>
                    <Input label="每日自疗次数 (Surges)" value={d.surges} onChange={(v) => update('surges', v)} />

                    <div className="row">
                        <div className="col"><Text label="擅长护甲" value={d.armorProf} onChange={(v) => update('armorProf', v)} /></div>
                        <div className="col"><Text label="擅长武器" value={d.weaponProf} onChange={(v) => update('weaponProf', v)} /></div>
                    </div>
                    <Input label="防御加值" value={d.defBonus} onChange={(v) => update('defBonus', v)} />

                    <Text label="受训技能" value={d.trainedSkills} onChange={(v) => update('trainedSkills', v)} />

                    <TraitListEditor label="门派特技 (School Features)" value={d.features} onChange={(v) => update('features', v)} />
                </form>
            </div>
        );
    } else if (module === 'roots') {
        const d = item as RootItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label="根骨名称" value={d.name} onChange={(v) => update('name', v)} />
                    <Input label="属性加成" value={d.attributes} onChange={(v) => update('attributes', v)} />
                    <div className="row">
                        <div className="col"><Input label="体型" value={d.size} onChange={(v) => update('size', v)} /></div>
                        <div className="col"><Input label="速度" value={d.speed} onChange={(v) => update('speed', v)} /></div>
                    </div>
                    <Input label="视觉" value={d.vision} onChange={(v) => update('vision', v)} />
                    <Text label="描述/体征" value={d.flavor} onChange={(v) => update('flavor', v)} />
                </form>
            </div>
        );
    } else if (module === 'origins') {
        const d = item as OriginItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label="出身名称" value={d.name} onChange={(v) => update('name', v)} />
                    <div className="row">
                        <div className="col"><Input label="语言" value={d.languages} onChange={(v) => update('languages', v)} /></div>
                        <div className="col"><Input label="技能加值" value={d.skillBonuses} onChange={(v) => update('skillBonuses', v)} /></div>
                    </div>
                    <Text label="背景描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <TraitListEditor label="出身特性 (Traits)" value={d.traits} onChange={(v) => update('traits', v)} />
                </form>
            </div>
        );
    } else if (module === 'destinies') {
        // Racial Power replacement
        const d = item as DestinyItem;
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label="威能名称" value={d.name} onChange={(v) => update('name', v)} />
                    <Text label="描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <div className="row">
                        <div className="col"><Input label="类型" value={d.powerType} onChange={(v) => update('powerType', v)} /></div>
                        <div className="col">
                            <Select label="动作" value={d.action} onChange={(v) => update('action', v)}
                                options={Object.entries(ActionMap).map(([k, v]) => ({ v: k, t: v.t }))}
                            />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col"><RangeBuilder value={d.range} onChange={(v) => update('range', v)} /></div>
                        <div className="col"><Input label="目标" value={d.target} onChange={(v) => update('target', v)} /></div>
                    </div>
                    <Text label="效果" value={d.effect} onChange={(v) => update('effect', v)} />
                </form>
            </div>
        );
    } else {
        // Generic / Feats
        const d = item as GeneralItem;
        const lbl = '造诣';
        return (
            <div className="editor-panel">
                <form onSubmit={e => e.preventDefault()}>
                    <Input label={lbl + '名称'} value={d.name} onChange={(v) => update('name', v)} />
                    <Input label="修炼门槛" value={d.req} onChange={(v) => update('req', v)} />
                    <Input label="层级" value={d.tier} onChange={(v) => update('tier', v)} />
                    <Text label="描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <Text label="造诣效果" value={d.benefit} onChange={(v) => update('benefit', v)} />
                </form>
            </div>
        );
    }
};

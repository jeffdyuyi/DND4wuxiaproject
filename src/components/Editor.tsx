import { TermDisplay } from './TermDisplay';
import { HeaderColorEditor } from './HeaderColorEditor';

import React from 'react';
import type { ModuleType } from '../constants';
import { TermInput, TermSelect, RuleText } from './TermControls';
import { PowerEditor } from './PowerEditor';
import { TemplateReference } from './TemplateReference';
import type { Item, MoveItem, EquipmentItem, GeneralItem, SchoolItem, RootItem, OriginItem, DestinyItem } from '../types';
import { Input, Text, RangeBuilder, TraitListEditor } from './FormHelpers';
import { ProgressionEditor } from './Progression';
import type { ProgressionItem } from '../types';

interface EditorProps {
    module: ModuleType;
    item: Item | null;
    onChange: (newItem: Item) => void;
}

export const Editor: React.FC<EditorProps> = ({ module, item, onChange }) => {
    if (!item) return <div className="editor-panel"><TermDisplay>{"请选择或新建条目"}</TermDisplay></div>;

    if (module === 'traditions' || module === 'paths') {
        return <ProgressionEditor module={module} item={item as ProgressionItem} onChange={onChange} />;
    }

    const update = (key: string, val: unknown) => {
        onChange({ ...item, [key]: val });
    };

    if (module === 'moves') {
        return <div className="editor-panel"><TemplateReference item={item} /><PowerEditor item={item as MoveItem} onChange={onChange} /></div>;
    } else if (module === 'items') {
        const d = item as EquipmentItem;
        return (
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
                <form onSubmit={e => e.preventDefault()}>
                    <div className="row">
                        <div className="col"><Input label="宝物名称" value={d.name} onChange={(v) => update('name', v)} /></div>
                        <div className="col"><Input label="等级" value={d.level} onChange={(v) => /^\d*$/.test(v) && update('level', Number(v))} /></div>
                    </div>
                    <div className="row">
                        <div className="col"><TermInput label="部位" value={d.slot} categories={['slot']} onChange={(v) => update('slot', v)} /></div>
                        <div className="col"><Input label="价值" value={d.price} onChange={(v) => update('price', v)} /></div>
                    </div>
                    <TermInput label="类型 (如：重刃)" value={d.type} categories={['weaponGroup', 'weapon', 'implement', 'armor']} collectAs="weaponGroup" onChange={(v) => update('type', v)} />
                    <Text label="外观" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <Input label="淬炼等级" value={d.enhance} onChange={(v) => update('enhance', v)} />
                    <Input label="暴击效果" value={d.crit} onChange={(v) => update('crit', v)} />
                    <RuleText label="特性 (Property)" value={d.prop} onChange={(v) => update('prop', v)} />
                    <RuleText label="神通 (Power)" value={d.power} onChange={(v) => update('power', v)} />
                </form>
            </div>
        );
    } else if (module === 'schools') {
        const d = item as SchoolItem;
        return (
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
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
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
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
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
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
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
                <form onSubmit={e => e.preventDefault()}>
                    <Input label="威能名称" value={d.name} onChange={(v) => update('name', v)} />
                    <Text label="描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <div className="row">
                        <div className="col"><Input label="类型" value={d.powerType} onChange={(v) => update('powerType', v)} /></div>
                        <div className="col">
                            <TermSelect label="动作" category="action" value={d.action} snapshot={d.actionLabel} onChange={(action, actionLabel) => onChange({ ...item, action, actionLabel })} />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col"><RangeBuilder value={d.range} onChange={(v) => update('range', v)} /></div>
                        <div className="col"><Input label="目标" value={d.target} onChange={(v) => update('target', v)} /></div>
                    </div>
                    <RuleText label="效果" value={d.effect} onChange={(v) => update('effect', v)} />
                </form>
            </div>
        );
    } else {
        // Generic / Feats
        const d = item as GeneralItem;
        const lbl = '造诣';
        return (
            <div className="editor-panel"><TemplateReference item={item} /><HeaderColorEditor module={module} item={item} onChange={onChange} />
                <form onSubmit={e => e.preventDefault()}>
                    <Input label={lbl + '名称'} value={d.name} onChange={(v) => update('name', v)} />
                    <Input label="修炼门槛" value={d.req} onChange={(v) => update('req', v)} />
                    <Input label="层级" value={d.tier} onChange={(v) => update('tier', v)} />
                    <Text label="描述" value={d.flavor} onChange={(v) => update('flavor', v)} />
                    <RuleText label="造诣效果" value={d.benefit} onChange={(v) => update('benefit', v)} />
                </form>
            </div>
        );
    }
};

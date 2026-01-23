
import React from 'react';
import { Keywords, RangeTypes, Shapes, Stats, Defenses } from '../constants';

interface FieldProps {
    label: string;
    value: any;
    onChange: (val: any) => void;
}

export const Input: React.FC<FieldProps> = ({ label, value, onChange }) => (
    <div className="form-group">
        <label>{label}</label>
        <input
            type="text"
            className="form-control"
            value={value || ''}
            onInput={(e) => onChange(e.currentTarget.value)}
        />
    </div>
);

export const Text: React.FC<FieldProps> = ({ label, value, onChange }) => (
    <div className="form-group">
        <label>{label}</label>
        <textarea
            className="form-control"
            value={value || ''}
            onInput={(e) => onChange(e.currentTarget.value)}
        />
    </div>
);

export const Select: React.FC<FieldProps & { options: { v: string; t: string }[] }> = ({ label, value, onChange, options }) => (
    <div className="form-group">
        <label>{label}</label>
        <select
            className="form-control"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
        >
            {options.map(o => (
                <option key={o.v} value={o.v}>{o.t}</option>
            ))}
        </select>
    </div>
);

export const KeywordSelector: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const currentKeys = (value || "").split(/[,，]\s*/).filter(s => s);

    const toggleKey = (tag: string) => {
        const has = currentKeys.includes(tag);
        const newKeys = has ? currentKeys.filter(k => k !== tag) : [...currentKeys, tag];
        onChange(newKeys.join('，'));
    };

    return (
        <div className="form-group">
            <label>功法属性 (点击选择)</label>
            <div className="keyword-group">
                <div className="keyword-group-title">来源</div>
                {Keywords.source.map(k => (
                    <span key={k} className={`check-btn ${currentKeys.includes(k) ? 'selected' : ''}`} onClick={() => toggleKey(k)}>{k}</span>
                ))}
            </div>
            <div className="keyword-group">
                <div className="keyword-group-title">伤害</div>
                {Keywords.damage.map(k => (
                    <span key={k} className={`check-btn ${currentKeys.includes(k) ? 'selected' : ''}`} onClick={() => toggleKey(k)}>{k}</span>
                ))}
            </div>
            <div className="keyword-group">
                <div className="keyword-group-title">效应</div>
                {Keywords.effect.map(k => (
                    <span key={k} className={`check-btn ${currentKeys.includes(k) ? 'selected' : ''}`} onClick={() => toggleKey(k)}>{k}</span>
                ))}
            </div>
            <div className="keyword-group">
                <div className="keyword-group-title">器材</div>
                {Keywords.accessory.map(k => (
                    <span key={k} className={`check-btn ${currentKeys.includes(k) ? 'selected' : ''}`} onClick={() => toggleKey(k)}>{k}</span>
                ))}
            </div>
            <input
                type="text"
                className="form-control"
                style={{ marginTop: '5px' }}
                value={value || ''}
                onInput={(e) => onChange(e.currentTarget.value)}
                placeholder="自定义，用逗号分隔"
            />
        </div>
    );
};

export const RangeBuilder: React.FC<{ value: string; onChange: (val: string) => void }> = ({ value, onChange }) => {
    const [type, setType] = React.useState('Melee');
    const [shape, setShape] = React.useState('Burst');
    const [dist, setDist] = React.useState('');

    const buildRange = (t: string, s: string, d: string) => {
        let res = "";
        if (t === 'Melee') res = d === 'Weapon' ? "近战 兵器" : (d === 'Touch' ? "近战 接触" : `近战 ${d}`);
        else if (t === 'Ranged') res = d === 'Weapon' ? "远程 兵器" : (d === 'Sight' ? "远程 目视" : `远程 ${d}`);
        else if (t === 'Close') res = `近距${Shapes[s as keyof typeof Shapes]} ${d}`;
        else if (t === 'Area') res = `区域${Shapes[s as keyof typeof Shapes]} ${d} (10格内)`;

        onChange(res);
    };

    const handleTypeChange = (t: string) => { setType(t); buildRange(t, shape, dist); };
    const handleShapeChange = (s: string) => { setShape(s); buildRange(type, s, dist); };
    const handleDistChange = (d: string) => { setDist(d); buildRange(type, shape, d); };

    return (
        <div className="form-group">
            <label>攻击范围 (构建器)</label>
            <div className="range-builder">
                <select onChange={(e) => handleTypeChange(e.target.value)} value={type}>
                    {Object.entries(RangeTypes).map(([k, v]) => <option key={k} value={k}>{v.split('(')[0]}</option>)}
                </select>
                {(type === 'Close' || type === 'Area') && (
                    <select onChange={(e) => handleShapeChange(e.target.value)} value={shape}>
                        {Object.entries(Shapes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                )}
                <input
                    type="text"
                    placeholder="距离/兵器"
                    style={{ width: '80px' }}
                    value={dist}
                    onInput={(e) => handleDistChange(e.currentTarget.value)}
                />
            </div>
            <input
                type="text"
                className="form-control"
                value={value || ''}
                onInput={(e) => onChange(e.currentTarget.value)}
                style={{ marginTop: '5px' }}
            />
        </div>
    );
}

export const AttackBuilder: React.FC<{ att: string; def: string; onUpdate: (a: string, d: string) => void }> = ({ att, def, onUpdate }) => {
    return (
        <div className="form-group">
            <label>较量判定 (攻 vs 守)</label>
            <div className="row">
                <select className="form-control" value={att || ''} onChange={(e) => onUpdate(e.target.value, def)}>
                    <option value="">--攻方--</option>
                    {Stats.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
                <span style={{ paddingTop: '10px' }}>vs</span>
                <select className="form-control" value={def || ''} onChange={(e) => onUpdate(att, e.target.value)}>
                    {Object.entries(Defenses).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
                </select>
            </div>
        </div>
    );
};

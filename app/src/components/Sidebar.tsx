
import React from 'react';
import type { ModuleType } from '../constants';
import { Config } from '../constants';

interface SidebarProps {
    currentModule: ModuleType;
    onSwitchModule: (mod: ModuleType) => void;
}

const ICONS: Record<ModuleType, string> = {
    moves: '⚔️',
    roots: '🧬',
    destinies: '🔮',
    origins: '🏯',
    feats: '🧘',
    items: '🗡️'
};

export const Sidebar: React.FC<SidebarProps> = ({ currentModule, onSwitchModule }) => {
    return (
        <div className="main-nav">
            {(Object.keys(Config) as ModuleType[]).map((mod) => (
                <div
                    key={mod}
                    className={`nav-btn ${currentModule === mod ? 'active' : ''}`}
                    onClick={() => onSwitchModule(mod)}
                >
                    <span className="nav-icon">{ICONS[mod]}</span>
                    {Config[mod].title.substring(0, 2)} {/* Usually simplified or just title? Original used full "武学" etc, let's check constants */}
                    {/* The original text was "武学", "根骨" etc. Config titles are "武学招式库". I should extract the short name or store it. */}
                    {/* Wait, the original HTML hardcoded the text in the div: <div ...>武学</div> */}
                    {/* I'll infer it or add it to Config if I can edit constants.ts again. Or just use substring or logical mapping. */}
                    {/* Config titles are 4-5 chars. "武学招式库" -> "武学". "根骨天赋库" -> "根骨". */}
                    <span style={{ fontSize: '10px' }}>{Config[mod].title.substring(0, 2)}</span>
                </div>
            ))}
        </div>
    );
};

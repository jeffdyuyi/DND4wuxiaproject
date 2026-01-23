
import React from 'react';
import type { ModuleType } from '../constants';
import { Config, ICONS } from '../constants';

interface SidebarProps {
    currentModule: ModuleType;
    viewMode: 'home' | 'tool';
    onSwitchModule: (mod: ModuleType) => void;
    onGoHome: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentModule, viewMode, onSwitchModule, onGoHome }) => {
    return (
        <div className="main-nav">
            {/* Home Button */}
            <div
                className={`nav-btn ${viewMode === 'home' ? 'active' : ''}`}
                onClick={onGoHome}
                style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}
            >
                <span className="nav-icon">🏠</span>
                <span style={{ fontSize: '10px' }}>首页</span>
            </div>

            {(Object.keys(Config) as ModuleType[]).map((mod) => (
                <div
                    key={mod}
                    className={`nav-btn ${viewMode === 'tool' && currentModule === mod ? 'active' : ''}`}
                    onClick={() => onSwitchModule(mod)}
                >
                    <span className="nav-icon">{ICONS[mod]}</span>
                    <span style={{ fontSize: '10px' }}>{Config[mod].title.substring(0, 2)}</span>
                </div>
            ))}
        </div>
    );
};

import type { ModuleType } from '../constants';
import { Config, ICONS } from '../constants';
import { modules } from '../utils/resources';

interface SidebarProps {
    currentModule: ModuleType;
    viewMode: 'home' | 'tool';
    onSwitchModule: (module: ModuleType) => void;
    onGoHome: () => void;
}

export function Sidebar({ currentModule, viewMode, onSwitchModule, onGoHome }: SidebarProps) {
    return <nav className="main-nav" aria-label="资源导航">
        <button type="button" className={'nav-btn nav-home ' + (viewMode === 'home' ? 'active' : '')}
            aria-current={viewMode === 'home' ? 'page' : undefined} onClick={onGoHome}>
            <span className="nav-icon" aria-hidden="true">🏠</span><span>首页</span>
        </button>
        {modules.map(module => {
            const active = viewMode === 'tool' && currentModule === module;
            return <button type="button" key={module} className={'nav-btn ' + (active ? 'active' : '')}
                aria-label={Config[module].title} title={Config[module].title} aria-current={active ? 'page' : undefined}
                onClick={() => onSwitchModule(module)}>
                <span className="nav-icon" aria-hidden="true">{ICONS[module]}</span>
                <span>{Config[module].title.substring(0, 2)}</span>
            </button>;
        })}
    </nav>;
}

import { TermDisplay } from './TermDisplay';
import type { CSSProperties, ReactNode } from 'react';
import type { ModuleType } from '../constants';
import type { BaseItem } from '../types';
import { headerTextColor, resolveHeaderColor } from '../utils/card-colors';

export function CardHeader({ module, item, children }: { module: ModuleType; item: BaseItem; children: ReactNode }) {
    const backgroundColor = resolveHeaderColor(module, item);
    const color = headerTextColor(backgroundColor);
    return <div className="card-header" style={{ backgroundColor, color, '--card-title-shadow': color === '#FFFFFF' ? '1px 1px 0 rgba(0,0,0,0.5)' : 'none' } as CSSProperties}>{<TermDisplay>{children}</TermDisplay>}</div>;
}

import type { ModuleType } from '../constants';
import type { BaseItem } from '../types';

// Sampled from the local Chinese 4E PHB; see docs/card-colors.md for pages and method.
export const POWER_HEADER_COLORS = { basic: '#2AA738', special: '#D0121B', ultimate: '#776C66' } as const;
export const TYPE_HEADER_COLORS: Record<ModuleType, string> = {
    moves: POWER_HEADER_COLORS.basic, items: '#F39700', schools: '#02325A',
    roots: '#315C48', origins: '#805B3F', destinies: '#66507B', feats: '#455A64',
    traditions: '#23686B', paths: '#8D3045',
};
export function isHeaderColor(value: unknown): value is string {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
export function defaultHeaderColor(module: ModuleType, item: BaseItem): string {
    if (module === 'moves' && typeof item.type === 'string' && Object.hasOwn(POWER_HEADER_COLORS, item.type)) {
        return POWER_HEADER_COLORS[item.type as keyof typeof POWER_HEADER_COLORS];
    }
    return TYPE_HEADER_COLORS[module];
}
export function resolveHeaderColor(module: ModuleType, item: BaseItem): string {
    return isHeaderColor(item.headerColor) ? item.headerColor.toUpperCase() : defaultHeaderColor(module, item);
}
export function headerTextColor(background: string): '#FFFFFF' | '#1A1A1A' {
    const channels = [1, 3, 5].map(offset => parseInt(background.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    const darkLuminance = ((26 / 255 + 0.055) / 1.055) ** 2.4;
    return (1.05 / (luminance + 0.05)) >= ((luminance + 0.05) / (darkLuminance + 0.05)) ? '#FFFFFF' : '#1A1A1A';
}

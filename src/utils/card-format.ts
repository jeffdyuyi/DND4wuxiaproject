import type { ProgressionItem } from '../types';

/** A deleted embedded power must fall back to a complete resource card. */
export function resolveCardFormat(format: string, powers: ProgressionItem['powers'] = []): string {
    if (format === 'full' || format === 'summary') return format;
    return powers.some(power => `power:${power.id}` === format) ? format : 'full';
}

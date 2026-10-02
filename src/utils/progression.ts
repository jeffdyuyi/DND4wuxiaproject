import type { MoveItem, ProgressionItem } from '../types';

type ProgressionModule = 'traditions' | 'paths';

export function newPower(level: number, type: MoveItem['type']): MoveItem {
    return {
        id: crypto.randomUUID(), name: '', level, type, cls: '', flavor: '',
        action: 'std', range: '', keywords: '', target: '', att: '', def: 'AC',
        hit: '', miss: '', effect: '', trigger: '', sustain: '', special: '', rules: [], source: '', sourceText: ''
    };
}

export function createProgressionDefaults(module: ProgressionModule): Omit<ProgressionItem, 'id' | 'name'> {
    const tradition = module === 'traditions';
    return {
        flavor: '', entryLevel: tradition ? '11' : '21', req: '', description: '', source: '',
        features: (tradition ? ['11', '11', '16'] : ['21', '24', '30']).map(level => ({
            id: crypto.randomUUID(), level, name: '', desc: ''
        })),
        powers: tradition
            ? [newPower(11, 'special'), newPower(12, 'ultimate'), newPower(20, 'ultimate')].map(power => ({ ...power, acquiredLevel: String(power.level) }))
            : [{ ...newPower(26, 'ultimate'), acquiredLevel: '26' }],
        culminationTitle: '', culmination: ''
    };
}

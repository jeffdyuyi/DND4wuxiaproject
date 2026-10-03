import { Config, type ModuleType } from '../constants';
import type { DB, Item, ResourceMap } from '../types';
import { newPower, createProgressionDefaults } from './progression';

export const modules = Object.keys(Config) as ModuleType[];
export function emptyDB(): DB {
    return { schools: [], moves: [], roots: [], destinies: [], origins: [], feats: [], items: [], traditions: [], paths: [] };
}

export function createResource<K extends ModuleType>(module: K): ResourceMap[K] {
    const base = { id: crypto.randomUUID(), name: '新条目', flavor: '', source: '', sourceText: '' };
    let item: Item;
    switch (module) {
        case 'moves': item = { ...newPower(1, 'basic'), ...base }; break;
        case 'items': item = { ...base, level: 1, type: '', price: '', slot: '', enhance: '', crit: '', prop: '', power: '' }; break;
        case 'schools': item = { ...base, description: '', armorProf: '', weaponProf: '', defBonus: '', hpStart: '', hpPerLvl: '', surges: '', trainedSkills: '', features: [] }; break;
        case 'roots': item = { ...base, attributes: '', size: '', speed: '', vision: '' }; break;
        case 'origins': item = { ...base, languages: '', skillBonuses: '', traits: [] }; break;
        case 'destinies': item = { ...base, powerType: '遭遇', action: 'min', range: '', target: '', effect: '' }; break;
        case 'traditions': case 'paths': item = { ...base, ...createProgressionDefaults(module) }; break;
        default: item = { ...base, tier: '英雄层级', req: '', benefit: '' };
    }
    return item as ResourceMap[K];
}

/** The selected module establishes the resource type at this boundary. */
export function withItems(db: DB, module: ModuleType, items: Item[]): DB {
    return { ...db, [module]: items } as DB;
}

export function duplicateResource<T extends Item>(item: T): T {
    const copy = structuredClone(item);
    const refresh = (value: unknown): void => {
        if (Array.isArray(value)) value.forEach(refresh);
        else if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            if (typeof record.id === 'string') record.id = crypto.randomUUID();
            Object.values(record).forEach(refresh);
        }
    };
    refresh(copy);
    return copy;
}

export function resourceSearchText(item: Item, display: (text: string) => string = text => text): string {
    const text: string[] = [];
    const collect = (value: unknown, key = ''): void => {
        if (key === 'id') return;
        if (typeof value === 'string' || typeof value === 'number') text.push(String(value));
        else if (Array.isArray(value)) value.forEach(v => collect(v));
        else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collect(v, k));
    };
    collect(item);
    return display(text.join(' ')).toLocaleLowerCase();
}

export function searchResources(db: DB, term: string, display: (text: string) => string = text => text): { module: ModuleType; item: Item }[] {
    const query = term.trim().toLocaleLowerCase();
    if (!query) return [];
    return modules.flatMap(module => db[module]
        .filter(item => resourceSearchText(item).includes(query) || resourceSearchText(item, display).includes(query))
        .map(item => ({ module, item })));
}

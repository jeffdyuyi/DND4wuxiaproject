import { keywordCategories, WuxiaMappings, type Term, type Terminology, type TermCategory } from './terminology';

export const termName = (term: Term) => term.replacement === undefined ? term.label : term.replacement.trim() || term.original || term.value;
const translators = new WeakMap<Terminology, Map<string, (text: string) => string>>();
export function missingConfirmedMappings(library: Terminology) {
    return WuxiaMappings.filter(([category, original]) => !(category === 'effect' && original === '区域')).flatMap(([category, original, replacement]) => {
        const term = library.entries.find(term => term.category === category && (term.original || term.value) === original);
        const current = term?.replacement ?? (term?.label !== (term?.original || term?.value) ? term?.label : '');
        return term && !current?.trim() ? [{ term, replacement }] : [];
    });
}
export function fillConfirmedMappings(library: Terminology): Terminology {
    return missingConfirmedMappings(library).reduce((next, { term, replacement }) => setReplacement(next, term.id, replacement), library);
}
export function setReplacement(library: Terminology, id: string, replacement: string): Terminology {
    if (/[,，、;；\n]/.test(replacement)) throw new Error('一个置换名称不能包含分隔符');
    const target = library.entries.find(term => term.id === id);
    // Existing wuxia suggestions become aliases of the standard term when explicitly paired.
    const entries = library.entries.filter(term => term.id === id || !(target?.origin === '4e' && term.origin === 'wuxia' && term.category === target.category && termName(term) === replacement.trim()));
    return { ...library, entries: entries.map(term => term.id !== id ? term : {
        ...term, original: term.original || term.value, replacement: replacement.trim(),
        aliases: [...new Set([...(term.aliases || []), term.label, termName(term), replacement.trim()].filter(alias => alias && alias !== (term.original || term.value)))],
        label: replacement.trim() || term.original || term.value,
    }) };
}

/** One pass, longest match first; replacement output is never fed back into the matcher. */
export function createTermTranslator(library: Terminology, reverse = false, scope?: TermCategory | 'keyword') {
    const cached = translators.get(library) || new Map<string, (text: string) => string>();
    const direction = `${reverse ? 'reverse' : 'forward'}:${scope || 'all'}`;
    const existing = cached.get(direction);
    if (existing) return existing;
    const candidates = new Map<string, Set<string>>();
    for (const term of library.entries) {
        if (scope && !(scope === 'keyword' ? keywordCategories.includes(term.category) : term.category === scope)) continue;
        const original = term.original || term.value;
        const display = termName(term);
        const sources = reverse ? [display] : [original, ...(term.aliases || []), ...(term.category === 'defense' ? [term.value] : [])];
        for (const source of sources) {
            if (!source) continue;
            const targets = candidates.get(source) || new Set<string>();
            targets.add(reverse ? original : display); candidates.set(source, targets);
        }
    }
    // An unchanged reference in another category does not veto an explicit replacement.
    const mappings = new Map([...candidates].flatMap(([source, targets]) => {
        const changed = [...targets].filter(target => target !== source);
        if (changed.length > 1) return [];
        return [[source, changed[0] || [...targets][0]] as [string, string]];
    }));
    const keys = [...mappings.keys()].sort((a, b) => b.length - a.length);
    if (!keys.length) return (text: string) => text;
    const expression = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
    const translate = (text: string) => {
        const protectedRanges = [...text.matchAll(/https?:\/\/[^\s<>"')\]]+|mailto:[^\s<>"')\]]+|`+[^`]*`+/gu)].map(match => [match.index, match.index + match[0].length]);
        return text.replace(expression, (word, offset: number) => {
        if (protectedRanges.some(([start, end]) => offset >= start && offset < end)) return word;
        // Canonical English abbreviations must not alter formulas, identifiers or longer words.
        if (/^[A-Za-z]+$/.test(word) && /[A-Za-z0-9_]/.test((text[offset - 1] || '') + (text[offset + word.length] || ''))) return word;
        return mappings.get(word) || word;
        });
    };
    cached.set(direction, translate); translators.set(library, cached);
    return translate;
}

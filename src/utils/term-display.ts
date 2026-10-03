import type { Term, Terminology } from './terminology';

export const termName = (term: Term) => term.replacement === undefined ? term.label : term.replacement.trim() || term.original || term.value;
const translators = new WeakMap<Terminology, { forward?: (text: string) => string; reverse?: (text: string) => string }>();
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
export function createTermTranslator(library: Terminology, reverse = false) {
    const cached = translators.get(library) || {};
    const direction = reverse ? 'reverse' : 'forward';
    if (cached[direction]) return cached[direction];
    const candidates = new Map<string, Set<string>>();
    for (const term of library.entries) {
        const original = term.original || term.value;
        const display = termName(term);
        const sources = reverse ? [display] : [original, ...(term.aliases || []), ...(term.category === 'defense' ? [term.value] : [])];
        for (const source of sources) {
            if (!source) continue;
            const targets = candidates.get(source) || new Set<string>();
            targets.add(reverse ? original : display); candidates.set(source, targets);
        }
    }
    const mappings = new Map([...candidates].filter(([, targets]) => targets.size === 1).map(([source, targets]) => [source, [...targets][0]]));
    const keys = [...mappings.keys()].sort((a, b) => b.length - a.length);
    if (!keys.length) return (text: string) => text;
    const expression = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
    const translate = (text: string) => text.replace(expression, (word, offset: number) => {
        // Canonical English abbreviations must not alter formulas, identifiers or longer words.
        if (/^[A-Za-z]+$/.test(word) && /[A-Za-z0-9_]/.test((text[offset - 1] || '') + (text[offset + word.length] || ''))) return word;
        return mappings.get(word) || word;
    });
    cached[direction] = translate; translators.set(library, cached);
    return translate;
}

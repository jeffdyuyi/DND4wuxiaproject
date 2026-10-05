export type MarkdownFormat = 'bold' | 'italic' | 'underline' | 'unordered' | 'ordered';
export interface TextEdit { value: string; start: number; end: number; }

const inlineShortcuts: Readonly<Record<string, MarkdownFormat>> = { b: 'bold', i: 'italic', u: 'underline' };
const listShortcuts: Readonly<Record<string, MarkdownFormat>> = { Digit7: 'ordered', Digit8: 'unordered' };

export function markdownShortcut(key: string, code: string, shift: boolean): MarkdownFormat | undefined {
    return shift ? listShortcuts[code] : inlineShortcuts[key.toLowerCase()];
}

/** Operate on the displayed selection; callers retain terminology conversion. */
export function formatMarkdown(value: string, start: number, end: number, format: MarkdownFormat): TextEdit {
    if (format === 'ordered' || format === 'unordered') {
        const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
        const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
        const boundary = value.indexOf('\n', last);
        const to = boundary < 0 ? value.length : boundary;
        const lines = value.slice(from, to).split('\n');
        const marker = format === 'ordered' ? /^\s*\d+[.)]\s+/ : /^\s*[-+*]\s+/;
        const remove = lines.every(line => marker.test(line));
        const text = lines.map((line, index) => {
            const indent = line.match(/^\s*/)?.[0] ?? '';
            const body = line.slice(indent.length).replace(/^(?:\d+[.)]|[-+*])\s+/, '');
            return indent + (remove ? '' : format === 'ordered' ? `${index + 1}. ` : '- ') + body;
        }).join('\n');
        return { value: value.slice(0, from) + text + value.slice(to), start: from, end: from + text.length };
    }
    const marker = { bold: '**', italic: '*', underline: '++' }[format];
    const selected = value.slice(start, end);
    const boldBoundary = format === 'italic'
        && value.slice(0, start).match(/\*+$/)?.[0].length === 2
        && value.slice(end).match(/^\*+/)?.[0].length === 2;
    if (!boldBoundary && start >= marker.length && value.slice(start - marker.length, start) === marker && value.slice(end, end + marker.length) === marker) {
        return { value: value.slice(0, start - marker.length) + selected + value.slice(end + marker.length), start: start - marker.length, end: end - marker.length };
    }
    const selectedBold = format === 'italic' && selected.startsWith('**') && !selected.startsWith('***') && selected.endsWith('**') && !selected.endsWith('***');
    if (!selectedBold && selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
        const text = selected.slice(marker.length, -marker.length);
        return { value: value.slice(0, start) + text + value.slice(end), start, end: start + text.length };
    }
    return { value: value.slice(0, start) + marker + selected + marker + value.slice(end), start: start + marker.length, end: end + marker.length };
}

export function continueMarkdownList(value: string, start: number, end: number): TextEdit | undefined {
    if (start !== end || (start < value.length && value[start] !== '\n')) return;
    const from = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
    const line = value.slice(from, start);
    const match = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.*)$/);
    if (!match) return;
    if (!match[3].trim()) return { value: value.slice(0, from) + match[1] + value.slice(end), start: from + match[1].length, end: from + match[1].length };
    const marker = /^\d/.test(match[2]) ? `${Number.parseInt(match[2]) + 1}${match[2].slice(-1)}` : match[2];
    const text = `\n${match[1]}${marker} `;
    return { value: value.slice(0, start) + text + value.slice(end), start: start + text.length, end: start + text.length };
}

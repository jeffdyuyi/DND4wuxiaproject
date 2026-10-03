import type { OriginalEntry } from './templates';

const textOf = (value: unknown) => typeof value === 'string' ? value : '';
export function field(entry: OriginalEntry, ...keys: string[]): string {
    for (const key of keys) { const value = textOf(entry[key]) || entry.fields?.[key]; if (value) return value; }
    return '';
}
export function plainText(text: string, fields: Record<string, string> = {}): string {
    return text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/\{\{!!([^}]+)\}\}/g, (match, key) => fields[key] ?? match)
        .replace(/\[\[([^\]]+)\]\]/g, (_, body: string) => body.split('|')[0])
        .replace(/<br\s*\/?\s*>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ')
        .replace(/<<([^>]+)>>/g, '【原版宏：$1】').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&#(x[\da-f]+|\d+);/gi, (_, value: string) => { const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value); return code <= 0x10ffff ? String.fromCodePoint(code) : '�'; })
        .replace(/^@@[^\n]*$/gm, '').replace(/"""|''/g, '').replace(/\|\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
export function originalBody(entry: OriginalEntry): string {
    return [field(entry, 'flavorText'), field(entry, 'details'), field(entry, 'sourceText'), field(entry, 'benefit')].filter(Boolean).map(text => plainText(text, { ...entry.fields, title: entry.name })).join('\n\n');
}

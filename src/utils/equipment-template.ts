import type { EquipmentItem } from '../types';
import type { OriginalEntry, TemplateDraft } from './templates';
import { field, plainText } from './template-text';
import { equipmentMacros } from './equipment-macros';
import { readEquipmentVersions, versionCells } from './equipment-version-reader';

export function adaptEquipment(entry: OriginalEntry, item: EquipmentItem, powers: ReadonlyMap<string, OriginalEntry>, convertPower: (entry: OriginalEntry) => TemplateDraft): string[] {
    const warnings: string[] = [];
    const fields: Record<string, string> = { ...entry.fields, title: entry.name };
    const details = field(entry, 'details'), extra = field(entry, 'power');
    const structuredExtra = /bg-item|<h[1-6]\b/i.test(extra);
    const html = structuredExtra && !details.includes(extra) ? [details, extra].filter(Boolean).join('\n') : details;
    const headings = [...html.matchAll(/<(?:div\b[^>]*\bbg-item\b[^>]*|h[1-6]\b[^>]*)>([\s\S]*?)<\/(?:div|h[1-6])>/gi)].filter(match => /^(?:特性|属性|威能|神通|Power|Propert)/i.test(plainText(match[1], fields)));
    const header = html.slice(0, headings[0]?.index ?? html.length);
    const declared = (field(entry, 'itemLevel', 'item-level', 'level').match(/\d+/g) ?? []).map(Number).filter(level => Number.isSafeInteger(level) && level >= 0);
    const cells = readEquipmentVersions(header, fields, declared, warnings);
    const levels = [...new Set([...declared, ...cells.keys()])].sort((a, b) => a - b);
    item.level = levels[0] ?? 0;
    item.type = plainText(field(entry, 'itemSuitable', 'item-suitable', 'itemCategory', 'item-category'), fields);
    item.slot = plainText(field(entry, 'itemCategory', 'item-category'), fields);
    item.flavor = plainText(field(entry, 'flavorText'), fields);
    const scalar = (labels: string[]) => {
        for (const match of header.matchAll(/<b\b[^>]*>([\s\S]*?)<\/b>\s*([\s\S]*?)(?=<br\b|<\/div>|<b\b|$)/gi)) {
            if (labels.includes(plainText(match[1], fields).replace(/[：:]$/, '').trim())) return plainText(match[2], fields);
        }
        return '';
    };
    const target = field(entry, 'enhance', 'enhancement', 'enh') || scalar(['增强', '增強']);
    const critical = field(entry, 'crit', 'critical') || scalar(['重击', '重擊', '暴击']);
    const price = field(entry, 'price', 'cost') || scalar(['价格', '售价']);
    item.versions = levels.map(level => {
        const version = cells.get(level);
        const enhance = version?.enhance
            ? [version.enhance, target.replace(/^[+＋]\d+\s*[；;]?/, '').trim()].filter(Boolean).join('；')
            : target;
        return {
            id: crypto.randomUUID(), level,
            price: version?.price ?? (levels.length === 1 ? price : ''),
            enhance, crit: critical,
        };
    });
    const first = item.versions[0];
    item.price = first?.price ?? price;
    item.enhance = first?.enhance ?? target;
    item.crit = critical;
    if (first) item.selectedVersionId = first.id;
    if (item.versions.some(version => !version.price)) warnings.push('装备版本价格未明确给出，未展开等级宏；请核对或手动填写各版本价格。');
    if (target && item.versions.some(version => !/[+＋]\d+/.test(version.enhance))) warnings.push('装备增强仅给出作用对象，未推导增强数值；请核对各版本淬炼加值。');
    if (!levels.length) warnings.push('装备等级未明确给出，草稿记为 0；请核对原文。');

    item.powers = [];
    const resolved = new Set<string>();
    for (const ref of entry.wiki?.transclusions ?? []) {
        const power = powers.get(ref);
        if (!power || resolved.has(power.id)) continue;
        resolved.add(power.id);
        const draft = convertPower(power); item.powers.push(draft.item as NonNullable<EquipmentItem['powers']>[number]);
        warnings.push(...draft.warnings.map(warning => `${power.name}：${warning}`));
    }
    const properties: string[] = [];
    for (const [index, heading] of headings.entries()) {
        const title = plainText(heading[1], fields), raw = html.slice(heading.index! + heading[0].length, headings[index + 1]?.index ?? html.length);
        if (/^(?:特性|属性|Propert)/i.test(title)) { properties.push(plainText(raw, fields)); continue; }
        if (!plainText(raw, fields)) continue;
        const referenceOnly = plainText(raw, fields).match(/^\{\{([^{}]+)\}\}$/);
        if (referenceOnly && powers.has(referenceOnly[1])) continue;
        const usage = title.match(/随意|遭遇|每日/)?.[0] ?? '';
        const action = title.match(/[（(]([^）)]+)[）)]/)?.[1] ?? '';
        const draft = convertPower({ id: `${entry.id}#item-power-${index}`, name: `${entry.name} · ${title}`, category: 'power', level: '0', usageZh: usage, actionType: action, source: entry.source, details: raw.replace(/\{\{!!([^}]+)\}\}/g, (match, key: string) => fields[key] ?? match) });
        const power = draft.item as NonNullable<EquipmentItem['powers']>[number];
        power.templateParent = { entryId: entry.id, category: 'equipment' };
        item.powers.push(power);
        warnings.push(...draft.warnings.map(warning => `${title}：${warning}`));
    }
    let preamble = html.slice(0, headings[0]?.index ?? html.length);
    preamble = preamble.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, table => versionCells(table, fields).size ? '' : table)
        .replace(/<<\s*(item-level-[\w-]+)\s*>>/g, (match, name: string) => equipmentMacros[name] ? '' : match)
        .replace(/<div\b[^>]*>\s*<b\b[^>]*>[\s\S]*?<\/b>[\s\S]*?<\/div>/gi, block => {
            const label = plainText(block.match(/<b\b[^>]*>([\s\S]*?)<\/b>/i)?.[1] ?? '', fields).replace(/[：:]$/, '').trim();
            return ['增强', '增強', '重击', '重擊', '暴击', '价格', '售价', item.slot].includes(label) ? '' : block;
        });
    item.prop = [plainText(preamble, fields), field(entry, 'prop', 'properties'), levels.length > 1 && price ? `原版价格说明：${price}` : '', ...properties].filter(Boolean).join('\n\n');
    item.power = structuredExtra ? '' : plainText(extra, fields);
    if (!html) item.prop = plainText(field(entry, 'sourceText'), fields);
    if (item.powers.length) warnings.push('装备附属威能已独立拆出；行内威能未注明等级时记为 0，复杂正文保留在附加规则，请核对。');
    return warnings;
}

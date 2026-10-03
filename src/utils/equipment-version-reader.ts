import type { EquipmentVersion } from '../types';
import { plainText } from './template-text';
import { equipmentMacros } from './equipment-macros';

/** Read only explicit version cells. Unknown macros are retained in the source snapshot. */
export function versionCells(html: string, fields: Record<string, string>) {
    const versions = new Map<number, Partial<EquipmentVersion>>();
    for (const table of html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)) {
        for (const row of table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
            const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => plainText(cell[1], fields));
            for (let index = 0; index < cells.length; index++) {
                const match = cells[index].match(/^(?:等级|Level|Lv\.?)\s*(\d+)$/i);
                if (!match) continue;
                const level = Number(match[1]);
                if (!Number.isSafeInteger(level)) continue;
                const values: string[] = [];
                for (let next = index + 1; next < cells.length && !/^(?:等级|Level|Lv\.?)\s*\d+$/i.test(cells[next]); next++) values.push(cells[next]);
                const price = values.find(value => /\d[\d,.\s]*\s*(?:gp|金币|金幣|银币|銀幣|铜币|銅幣)/i.test(value));
                const enhance = values.find(value => /^[+＋]\d+$/.test(value));
                versions.set(level, { ...versions.get(level), ...(price ? { price } : {}), ...(enhance ? { enhance } : {}) });
            }
        }
    }
    return versions;
}

/** Merge exact macro definitions beneath explicit cells; preserve authored level scope. */
export function readEquipmentVersions(header: string, fields: Record<string, string>, declared: number[], warnings: string[]) {
    const cells = versionCells(header, fields);
    for (const match of header.matchAll(/<<\s*(item-level-[\w-]+)\s*>>/g)) {
        const rows = equipmentMacros[match[1]];
        if (!rows) { warnings.push(`装备等级宏未识别：${match[1]}；保留原文，请核对。`); continue; }
        if (declared.length && rows.some(([level]) => !declared.includes(level))) warnings.push(`装备等级字段与宏 ${match[1]} 不一致；仅填充声明等级，请核对原文。`);
        for (const [level, price, enhance] of rows) {
            if (declared.length && !declared.includes(level)) continue;
            const explicit = cells.get(level);
            if (explicit && ((explicit.price && explicit.price !== price) || (explicit.enhance && explicit.enhance !== enhance))) warnings.push(`装备版本 ${level} 级的表格与宏数值冲突；保留显式表格，请核对。`);
            cells.set(level, { price, ...(enhance ? { enhance } : {}), ...explicit });
        }
    }
    return cells;
}

import { type ModuleType } from '../constants';
import { TemplateModules, type TemplateSummary } from './templates';
import { listPacks, readPack, readSetting } from './template-cache';

export function templatesForTool(entries: TemplateSummary[], module: ModuleType) {
    return entries.filter(entry => TemplateModules[entry.category].includes(module));
}

export async function cachedToolPack(id?: string) {
    const packs = await listPacks();
    const preferred = id ?? await readSetting<string>('active');
    const selected = packs.find(pack => pack.id === preferred) ?? (id ? undefined : packs[0]);
    if (id && !selected) throw new Error('资料包已移除，请重新选择');
    const pack = selected ? await readPack(selected.id) : undefined;
    if (selected && !pack) throw new Error('资料包缓存缺失，请在资源管理中重新下载');
    return { packs, selected, pack };
}

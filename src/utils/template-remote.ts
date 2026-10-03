import { TemplateCategories, type OriginalEntry } from './templates';
import { prepareTemplatePack, type TemplatePack } from './template-loader';

export const REMOTE_SOURCE = 'https://4e-next.banque.ltd/data/';
const MAX_BYTES = 100 * 1024 * 1024;
async function remoteJSON(file: string, signal: AbortSignal) {
    const response = await fetch(REMOTE_SOURCE + file, { signal, credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) throw new Error(`4E NEXT 下载失败（${response.status}），可重试或导入本地资料包`);
    if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('远程文件超过 100 MB');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('浏览器无法读取下载流');
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
        while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > MAX_BYTES) throw new Error('远程文件超过 100 MB'); chunks.push(chunk.value); }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    const content = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.byteLength; }
    return { value: JSON.parse(new TextDecoder().decode(content)) as unknown, bytes };
}
function readManifest(value: unknown) {
    const manifest = value as { schemaVersion?: number; generatedAt?: string; categories?: Record<string, { count: number; file: string }> } | null;
    if (!manifest || manifest.schemaVersion !== 1 || typeof manifest.generatedAt !== 'string' || !manifest.categories) throw new Error('4E NEXT 数据清单版本或格式不兼容');
    for (const category of Object.keys(TemplateCategories)) {
        const entry = manifest.categories[category];
        if (!entry || !Number.isInteger(entry.count) || entry.count < 0 || entry.count > 100000 || entry.file !== `categories/${category}.json`) throw new Error('4E NEXT 分类路径或数量无效');
    }
    return manifest as { schemaVersion: number; generatedAt: string; categories: Record<string, { count: number; file: string }> };
}
export async function downloadRemotePack(signal: AbortSignal, onProgress: (message: string) => void): Promise<TemplatePack> {
    onProgress('正在检查 4E NEXT 数据清单…');
    const manifest = readManifest((await remoteJSON('manifest.json', signal)).value);
    const originals: OriginalEntry[] = []; let bytes = 0;
    const categories = Object.keys(TemplateCategories) as (keyof typeof TemplateCategories)[];
    for (const [position, category] of categories.entries()) {
        signal.throwIfAborted(); onProgress(`正在下载${TemplateCategories[category]}（${position + 1}/${categories.length}）…`);
        const result = await remoteJSON(`categories/${category}.json`, signal); bytes += result.bytes;
        if (bytes > MAX_BYTES) throw new Error('资料总量超过 100 MB，请改用拆分资料包');
        const rows = result.value as OriginalEntry[];
        if (!Array.isArray(rows) || rows.length !== manifest.categories[category].count || rows.some(row => row?.category !== category)) throw new Error('分类正文与清单不一致，下载未保存，请稍后重试');
        originals.push(...rows);
    }
    const latest = readManifest((await remoteJSON('manifest.json', signal)).value);
    if (JSON.stringify(manifest) !== JSON.stringify(latest)) throw new Error('原站资料在下载期间更新，请重试；已有缓存未改变');
    const pack: TemplatePack = { version: 1, sourceVersion: `4E NEXT schema-v${manifest.schemaVersion} / ${manifest.generatedAt}`, originals };
    prepareTemplatePack(pack); signal.throwIfAborted(); return pack;
}

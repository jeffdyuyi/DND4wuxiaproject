import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CardContent } from './Preview';
import type { ModuleType } from '../constants';
import type { Item } from '../types';
import { makeArchive } from '../utils/archive';
import { cardArchive, captureCard } from '../utils/card-image';
import { safeFilename, packFiles, downloadBlob, MAX_FILE_BYTES } from '../utils/card-files';

export async function exportCardBundle(entries: { module: ModuleType; item: Item }[], images: boolean, progress: (message: string) => void) {
    if (!entries.length || entries.length > 200) throw new Error('一次请选择 1–200 张卡片');
    const files: Record<string, Uint8Array> = {}; let bytes = 0;
    const add = (name: string, content: Uint8Array) => { bytes += content.length; if (bytes > MAX_FILE_BYTES) throw new Error('打包数据超过 100 MB，请分批导出'); files[name] = content; };
    for (const [index, entry] of entries.entries()) {
        progress(`正在打包 ${index + 1}/${entries.length}：${entry.item.name}`);
        const name = `${String(index + 1).padStart(3, '0')}_${safeFilename(entry.item.name)}`;
        add(`${name}.json`, new TextEncoder().encode(JSON.stringify(makeArchive({ [entry.module]: [entry.item] }))));
        if (images) {
            const stage = document.createElement('div'); stage.className = 'batch-card-stage'; document.body.appendChild(stage);
            const root = createRoot(stage);
            try { flushSync(() => root.render(<CardContent module={entry.module} item={entry.item} />)); const blob = await captureCard(stage, cardArchive(entry.module, entry.item)); add(`${name}.png`, new Uint8Array(await blob.arrayBuffer())); }
            finally { root.unmount(); stage.remove(); }
        }
    }
    add('README.txt', new TextEncoder().encode('吾侠卡片包：JSON 和下载的 PNG 均可重新导入编辑。同一张卡的 JSON 与 PNG 会合并为一个条目。请保留原文件，转码或截图可能丢失 PNG 内嵌数据。'));
    const zip = packFiles(files);
    if (zip.length > MAX_FILE_BYTES) throw new Error('ZIP 超过 100 MB，请减少卡片数量');
    downloadBlob(new Blob([new Uint8Array(zip)], { type: 'application/zip' }), '吾侠_卡片包.zip');
}

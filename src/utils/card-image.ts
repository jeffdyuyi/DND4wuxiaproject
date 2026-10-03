import { embedCardPNG } from './card-png';
import { makeArchive } from './archive';
import type { Item, ProgressionItem } from '../types';
import type { ModuleType } from '../constants';
export function cardArchive(module: ModuleType, item: Item, format = 'full') {
    const power = (module === 'traditions' || module === 'paths') ? (item as ProgressionItem).powers.find(power => `power:${power.id}` === format) : undefined;
    return power ? makeArchive({ moves: [power] }) : makeArchive({ [module]: [item] });
}
export async function captureCard(element: HTMLElement, value: unknown) {
    const snapshot = structuredClone(value);
    const stage = document.createElement('div'); stage.className = 'batch-card-stage';
    stage.style.width = `${Math.max(element.scrollWidth, element.offsetWidth, 400)}px`;
    stage.appendChild(element.cloneNode(true)); document.body.appendChild(stage);
    try {
        const { default: html2canvas } = await import('html2canvas');
        await document.fonts.ready;
        const canvas = await html2canvas(stage, { scale: 2, backgroundColor: null });
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片过长或无法生成，请选择单张威能或 JSON')), 'image/png'));
        const bytes = embedCardPNG(new Uint8Array(await blob.arrayBuffer()), snapshot);
        return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    } finally { stage.remove(); }
}

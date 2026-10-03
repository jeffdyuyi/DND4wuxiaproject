const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const keyword = 'WuxiaResource';
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => { let crc = value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); return crc >>> 0; });
export function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}
function chunks(bytes: Uint8Array) {
    if (bytes.length > 100 * 1024 * 1024 || signature.some((byte, index) => bytes[index] !== byte)) throw new Error('不是有效的 PNG，或图片超过 100 MB');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const result: { start: number; end: number; type: string; data: Uint8Array }[] = [];
    let offset = 8, ended = false;
    while (offset + 12 <= bytes.length) {
        const length = view.getUint32(offset), end = offset + 12 + length;
        if (end > bytes.length) throw new Error('PNG 数据不完整');
        const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
        if (crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) throw new Error('PNG 校验失败，文件可能损坏');
        result.push({ start: offset, end, type, data: bytes.subarray(offset + 8, end - 4) }); offset = end;
        if (type === 'IEND') { ended = true; break; }
    }
    if (!ended || offset !== bytes.length || result[0]?.type !== 'IHDR') throw new Error('PNG 结构不完整');
    return result;
}
function isCardText(type: string, data: Uint8Array) { return type === 'iTXt' && decoder.decode(data.subarray(0, data.indexOf(0))) === keyword; }
export function embedCardPNG(bytes: Uint8Array, value: unknown): Uint8Array {
    const original = chunks(bytes);
    const text = encoder.encode(JSON.stringify(value));
    if (text.length > 20 * 1024 * 1024) throw new Error('卡片数据超过 20 MB，请改用 JSON 导出');
    const prefix = encoder.encode(keyword + '\0\0\0\0\0');
    const chunk = new Uint8Array(12 + prefix.length + text.length), view = new DataView(chunk.buffer);
    view.setUint32(0, prefix.length + text.length); chunk.set(encoder.encode('iTXt'), 4); chunk.set(prefix, 8); chunk.set(text, 8 + prefix.length);
    view.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)));
    const retained = original.filter(row => !isCardText(row.type, row.data));
    const output = new Uint8Array(8 + chunk.length + retained.reduce((sum, row) => sum + row.end - row.start, 0));
    if (output.length > 100 * 1024 * 1024) throw new Error('图片超过 100 MB，请改用 JSON');
    output.set(signature); let offset = 8;
    for (const row of retained) { if (row.type === 'IEND') { output.set(chunk, offset); offset += chunk.length; } output.set(bytes.subarray(row.start, row.end), offset); offset += row.end - row.start; }
    return output;
}
export function readCardPNG(bytes: Uint8Array): unknown {
    const matches = chunks(bytes).filter(row => isCardText(row.type, row.data));
    if (matches.length !== 1) throw new Error('图片没有唯一的吾侠卡片数据。请使用本工具下载的可编辑 PNG 或原始 JSON；普通截图不能完整还原。');
    const data = matches[0].data, start = keyword.length + 1;
    if (data[start] !== 0 || data[start + 1] !== 0) throw new Error('不支持此图片的数据编码');
    const languageEnd = data.indexOf(0, start + 2), translatedEnd = data.indexOf(0, languageEnd + 1);
    if (languageEnd < 0 || translatedEnd < 0 || data.length - translatedEnd > 20 * 1024 * 1024) throw new Error('PNG 卡片数据格式或大小无效');
    return JSON.parse(decoder.decode(data.subarray(translatedEnd + 1)));
}

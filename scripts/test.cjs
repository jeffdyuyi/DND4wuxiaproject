const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
// Compile TS in memory: never touch browser data or generated repository files.
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
    module._compile(result.outputText, filename);
};
const load = file => require(path.join(__dirname, '..', 'src', file));
const { readArchive, makeArchive, mergeResources, normalizeResource, summarizeImport } = load('utils/archive.ts');
const { browserStorage, loadLibrary, saveLibrary, STORAGE_KEY } = load('utils/storage.ts');
const { createResource, emptyDB, resourceSearchText, duplicateResource, searchResources } = load('utils/resources.ts');
const { resolveCardFormat } = load('utils/card-format.ts');
const { parseRange, buildRange } = load('utils/range.ts');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { RichText } = load('components/RichText.tsx');
const { PowerCard } = load('components/PowerCard.tsx');
const { CardContent } = load('components/Preview.tsx');
const { defaultHeaderColor, resolveHeaderColor, headerTextColor, TYPE_HEADER_COLORS } = load('utils/card-colors.ts');
const { COLOR_LIBRARY_KEY, loadColorLibrary, saveColorLibrary, upsertColor, applyColorToItems } = load('utils/color-library.ts');

test('named palettes persist, deduplicate by color and preserve corrupt or unwritable data', () => {
    const bytes = new Map();
    bytes.set(STORAGE_KEY, 'existing card data');
    const storage = { getItem: key => bytes.get(key) ?? null, setItem: (key, value) => bytes.set(key, value) };
    assert.deepEqual(loadColorLibrary(storage).colors, []);
    const initial = upsertColor([], '  竹影  ', '#123abc');
    assert.equal(initial[0].name, '竹影'); assert.equal(initial[0].color, '#123ABC');
    const renamed = upsertColor(initial, '深竹影', '#123ABC');
    assert.equal(renamed.length, 1); assert.equal(renamed[0].id, initial[0].id);
    assert.equal(initial[0].name, '竹影', 'updates do not mutate previous palettes');
    assert.equal(saveColorLibrary(storage, renamed).ok, true);
    assert.equal(bytes.get(STORAGE_KEY), 'existing card data', 'saving a palette never submits card drafts or rewrites the resource archive');
    assert.deepEqual(loadColorLibrary(storage).colors, renamed);
    const saved = bytes.get(COLOR_LIBRARY_KEY);
    const denied = { ...storage, setItem: () => { throw new Error('quota'); } };
    assert.equal(saveColorLibrary(denied, upsertColor(renamed, '新配色', '#987654')).ok, false);
    assert.equal(bytes.get(COLOR_LIBRARY_KEY), saved);
    for (const raw of ['{broken', JSON.stringify({ schemaVersion: 99, colors: [] }), JSON.stringify({ schemaVersion: 1, colors: [{ id: 'x', name: '坏配色', color: 'red' }] })]) {
        bytes.set(COLOR_LIBRARY_KEY, raw);
        const loaded = loadColorLibrary(storage);
        assert(loaded.error); assert.equal(loaded.raw, raw); assert.equal(bytes.get(COLOR_LIBRARY_KEY), raw);
    }
    assert.throws(() => upsertColor([], ' ', '#123456'));
    assert.throws(() => upsertColor([], '无效', 'red'));
});

test('batch colors touch only selected resources and explicitly included embedded powers', () => {
    const parent = createResource('traditions'); parent.headerColor = '#010101'; parent.powers[0].headerColor = '#020202';
    const other = createResource('traditions');
    const snapshot = structuredClone(parent);
    const result = applyColorToItems([parent, other], [parent.id, 'missing'], '#123abc');
    assert.equal(result[0].headerColor, '#123ABC'); assert.equal(result[1], other);
    assert.equal(result[0].powers, parent.powers, 'parent-only operation keeps embedded powers');
    assert.deepEqual(parent, snapshot);
    const both = applyColorToItems([parent], [parent.id], '#456789', true)[0];
    assert.equal(both.powers[0].headerColor, '#456789'); assert.equal(parent.powers[0].headerColor, '#020202');
    const defaults = applyColorToItems([both], [parent.id], undefined, true)[0];
    assert.equal(defaults.headerColor, undefined); assert.equal(defaults.powers[0].headerColor, undefined);
    assert.throws(() => applyColorToItems([parent], [parent.id], 'url(x)'));
});

test('header colors use PHB frequency and item baselines; custom colors only affect title bands', () => {
    for (const [type, color] of Object.entries({ basic: '#2AA738', special: '#D0121B', ultimate: '#776C66' })) {
        const move = { ...createResource('moves'), type };
        assert.equal(defaultHeaderColor('moves', move), color);
        const markup = renderToStaticMarkup(React.createElement(PowerCard, { item: move }));
        assert(markup.includes(`background-color:${color}`));
    }
    assert.equal(TYPE_HEADER_COLORS.items, '#F39700');
    assert.equal(headerTextColor('#FFFFFF'), '#1A1A1A');
    assert.equal(headerTextColor('#000000'), '#FFFFFF');
    for (const module of Object.keys(TYPE_HEADER_COLORS)) {
        const item = { ...createResource(module), headerColor: '#123abc' };
        assert.equal(resolveHeaderColor(module, item), '#123ABC');
        const markup = renderToStaticMarkup(React.createElement(CardContent, { module, item }));
        assert(markup.includes('class="card-header" style="background-color:#123ABC;'), module);
        assert(!markup.includes('class="flavor" style="background-color:#123ABC'), 'body backgrounds remain unchanged');
    }
});

test('header overrides round-trip, reset to frequency defaults and remain independent for embedded powers', () => {
    const { cardArchive } = load('utils/card-image.ts');
    const item = createResource('traditions'); item.headerColor = '#abcdef';
    item.powers[0].headerColor = '#112233'; item.powers[0].name = '附属招式';
    const archive = readArchive(JSON.parse(JSON.stringify(makeArchive({ traditions: [item] }))));
    const restored = archive.traditions[0];
    assert.equal(restored.headerColor, '#ABCDEF');
    assert.equal(restored.powers[0].headerColor, '#112233');
    assert.equal(duplicateResource(restored).headerColor, '#ABCDEF');
    const markup = renderToStaticMarkup(React.createElement(ProgressionCard, { module: 'traditions', item: restored }));
    assert(markup.includes('background-color:#ABCDEF'));
    assert(markup.includes('background-color:#112233'));
    assert.equal(readArchive(cardArchive('traditions', restored, `power:${restored.powers[0].id}`)).moves[0].headerColor, '#112233');
    for (const invalid of ['', '#FFF', 'red', '#12345G', 'url(x)', 123, null]) {
        assert.throws(() => normalizeResource('moves', { ...createResource('moves'), headerColor: invalid }), /headerColor/);
    }
    const move = { ...createResource('moves'), headerColor: '#112233', type: 'ultimate' };
    assert.equal(resolveHeaderColor('moves', move), '#112233');
    delete move.headerColor;
    assert.equal(resolveHeaderColor('moves', move), '#776C66');
    assert.equal(normalizeResource('moves', createResource('moves')).headerColor, undefined);
});
const { ProgressionCard } = load('components/Progression.tsx');
const { defaultTerminology, validateTerminology, addTerms, mergeTerminology } = load('utils/terminology.ts');
const { readLibraryArchive } = load('utils/archive.ts');
const { TermSelect } = load('components/TermControls.tsx');
const { TerminologyContext } = load('hooks/TerminologyContext.tsx');
const { adaptTemplate, adaptPower, TemplateModules, plainText } = load('utils/templates.ts');
function storage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function testPNG() {
    const { crc32 } = load('utils/card-png.ts');
    const chunk = (type, data) => { const buffer = Buffer.alloc(data.length + 12); buffer.writeUInt32BE(data.length); buffer.write(type, 4); buffer.set(data, 8); buffer.writeUInt32BE(crc32(buffer.subarray(4, -4)), buffer.length - 4); return buffer; };
    const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
    return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', require('node:zlib').deflateSync(Buffer.from([0,0,0,0,255]))), chunk('IEND', Buffer.alloc(0))]);
}

test('power templates preserve primary, secondary and unrecognized rule sections without mutating originals', () => {
    const original = { id: 'source-power', name: '原版威能', category: 'power', usage: 'encounter', actionType: '即时中断', level: '11', keywords: '武器，雷鸣', range: '近战 兵器', details: '<table><tr><th>攻击：</th><td>力量 vs. AC</td></tr><tr><th>命中：</th><td>1[W]伤害</td></tr><tr><th>次攻击：</th><td>另一个目标</td></tr><tr><th>命中：</th><td>次攻击伤害</td></tr></table>' };
    const before = JSON.stringify(original);
    const draft = adaptPower(original, 'test');
    assert.equal(draft.item.action, 'interrupt'); assert.equal(draft.item.type, 'special');
    assert.equal(draft.item.def, 'AC'); assert.equal(draft.item.att, '力量');
    assert(draft.item.rules.some(rule => rule.text === '次攻击伤害'));
    assert.equal(draft.item.templateReference.entryId, original.id);
    assert.equal(draft.item.templateReference.originalJSON, before);
    draft.item.name = '魔改'; assert.equal(JSON.stringify(original), before);
    assert.equal(normalizeResource('moves', draft.item).rules.length, 2);
    const ambiguous = adaptPower({ ...original, usage: '特殊', details: '复杂规则 <<宏>>' }, 'test');
    assert(ambiguous.warnings.length); assert(ambiguous.item.rules[0].text.includes('复杂规则'));
    assert(!plainText('<script>alert(1)</script><p>正文</p>').includes('alert'));
});

test('progression templates resolve embedded powers and keep missing references and culmination', () => {
    const power = { id: '原版招式 English', name: '原版招式', category: 'power', usage: 'daily', actionType: '标准动作', level: '20', details: '<table><tr><th>效果：</th><td>效果全文</td></tr></table>' };
    const original = { id: '原版命运', name: '原版命运', category: 'epic-destiny', sourceText: '说明\n!! 不朽 Immortality\n终局全文\n!! 21级：特性\n特性全文\n!! 26级：招式\n{{原版招式 English}}\n!! 30级：未知\n{{缺失威能}}', wiki: { transclusions: [power.id, '缺失威能'] } };
    const draft = adaptTemplate(original, 'paths', 'test', new Map([[power.id, power]]))[0];
    assert.equal(draft.item.powers.length, 1); assert.equal(draft.item.powers[0].level, 20); assert.equal(draft.item.powers[0].acquiredLevel, '26');
    assert(draft.item.culmination.includes('终局全文')); assert(draft.item.features.some(feature => feature.desc.includes('缺失威能')));
    assert(draft.warnings.some(warning => warning.includes('缺失威能')));
    const restored = readArchive(makeArchive({ paths: [draft.item] })).paths[0];
    assert.equal(restored.templateReference.originalJSON, JSON.stringify(original));
    assert.equal(restored.powers[0].templateReference.entryId, power.id);
});

test('local source templates map to valid resource drafts and the index resolves exact source IDs', context => {
    const folder = path.join(__dirname, '../.local-templates');
    if (!fs.existsSync(folder)) { context.skip('本地资料包不随公开仓库分发'); return; }
    const index = JSON.parse(fs.readFileSync(path.join(folder, 'index.json'), 'utf8'));
    const files = [...new Set(index.entries.map(entry => entry.file))];
    const rows = files.flatMap(file => JSON.parse(fs.readFileSync(path.join(folder, file), 'utf8')));
    const byKey = new Map(rows.map(entry => [`${entry.category}:${entry.id}`, entry]));
    const powers = new Map(rows.filter(entry => entry.category === 'power').map(entry => [entry.id, entry]));
    assert.equal(index.entries.length, rows.length);
    for (const summary of index.entries) {
        const original = byKey.get(`${summary.category}:${summary.id}`); assert(original);
        for (const module of TemplateModules[summary.category]) {
            const drafts = adaptTemplate(original, module, index.sourceVersion, powers);
            assert(drafts.length > 0);
            for (const draft of drafts) {
                assert.equal(draft.module, module);
                const restored = normalizeResource(module, draft.item);
                assert(restored.sourceText || restored.templateReference.originalJSON);
                assert.notEqual(restored.id, original.id);
            }
        }
    }
});

test('template loader fetches related powers and rejects failed or invalid file requests', async () => {
    const { loadTemplate } = load('utils/template-loader.ts');
    const originalFetch = global.fetch;
    const controller = new AbortController();
    const power = { id: 'power-id', name: '招式', category: 'power' };
    const original = { id: 'path-id', name: '传承', category: 'paragon-path', wiki: { transclusions: ['power-id', '不存在'] } };
    const summary = { ...original, nameEn: '', level: '', keywords: '', source: '', file: 'test-path.json' };
    const index = { version: 1, sourceVersion: 'test', entries: [summary, { ...power, file: 'test-power.json' }] };
    global.fetch = async url => ({ ok: true, json: async () => String(url).includes('test-path') ? [original] : [power] });
    try {
        const result = await loadTemplate('/project/', summary, index, controller.signal);
        assert.equal(result.powers.get('power-id').name, '招式'); assert(!result.powers.has('不存在'));
        await assert.rejects(loadTemplate('/project/', { ...summary, file: '../unsafe.json' }, index, controller.signal), /文件名/);
        global.fetch = async () => ({ ok: false, status: 404 });
        await assert.rejects(loadTemplate('/project/', { ...summary, file: 'absent.json' }, index, controller.signal), /404/);
    } finally { global.fetch = originalFetch; }
});

test('private template packs validate atomically, preserve source snapshots and resolve embedded powers without network', async () => {
    const { importTemplatePack, loadTemplate, loadTemplateIndex } = load('utils/template-loader.ts');
    const power = { id: 'private-power', name: '自定义测试招式', category: 'power', fields: { usage: '随意' } };
    const parent = { id: 'private-path', name: '自定义测试传承', category: 'paragon-path', wiki: { transclusions: [power.id] } };
    const pack = { version: 1, sourceVersion: 'test-private', originals: [power, parent] };
    const index = importTemplatePack(pack);
    assert.equal(index.entries[0].searchText, '');
    power.name = '外部修改';
    const signal = new AbortController().signal;
    const result = await loadTemplate('/', index.entries[1], index, signal);
    assert.equal(result.powers.get(power.id).name, '自定义测试招式');
    assert.throws(() => importTemplatePack({ ...pack, originals: [parent, parent] }), /重复/);
    assert.throws(() => importTemplatePack({ ...pack, originals: [{ ...parent, wiki: { transclusions: [123] } }] }), /引用/);
    assert.throws(() => importTemplatePack({ ...pack, version: 2 }), /版本/);
    assert.equal((await loadTemplateIndex('/', signal)).sourceVersion, 'test-private');
});

test('large template caches persist beyond 5 MB and failed transactions keep previous packs', async () => {
    const fake = require('fake-indexeddb');
    const before = global.indexedDB; global.indexedDB = fake.indexedDB;
    const { savePack, listPacks, readPack, readSetting, deletePack } = load('utils/template-cache.ts');
    const identity = { id: 'test-large', name: '大资料测试', source: 'test' };
    const pack = { version: 1, sourceVersion: 'v1', originals: [{ id: 'large', name: '测试资源', category: 'feat', sourceText: 'a'.repeat(6 * 1024 * 1024) }] };
    try {
        const info = await savePack(pack, identity);
        assert(info.bytes > 5 * 1024 * 1024);
        assert.equal((await readPack(identity.id)).originals[0].sourceText.length, 6 * 1024 * 1024);
        assert.equal(await readSetting('active'), identity.id);
        assert.equal((await listPacks())[0].hash.length, 64);
        const originalPut = fake.IDBObjectStore.prototype.put;
        fake.IDBObjectStore.prototype.put = function(...args) { if (this.name === 'info') throw new Error('simulated transaction failure'); return originalPut.apply(this, args); };
        try { await assert.rejects(savePack({ ...pack, sourceVersion: 'v2', originals: [{ id: 'new', name: '新版', category: 'feat' }] }, identity), /simulated/); }
        finally { fake.IDBObjectStore.prototype.put = originalPut; }
        assert.equal((await readPack(identity.id)).sourceVersion, 'v1');
        assert.equal((await listPacks())[0].count, 1);
        await assert.rejects(savePack({ ...pack, originals: [{ id: 'bad', name: '坏资料', category: 'unknown' }] }, identity), /类别/);
        assert.equal((await readPack(identity.id)).sourceVersion, 'v1');
        await deletePack(identity.id);
        assert.equal((await listPacks()).length, 0); assert.equal(await readSetting('active'), undefined);
    } finally { global.indexedDB = before; }
});

test('remote template downloads restrict sources and validate counts, cancellation and changing manifests', async () => {
    const { downloadRemotePack, REMOTE_SOURCE } = load('utils/template-remote.ts');
    const categories = Object.keys(TemplateModules);
    const manifest = { schemaVersion: 1, generatedAt: '2026-01-01T00:00:00Z', categories: Object.fromEntries(categories.map(category => [category, { count: 1, file: `categories/${category}.json` }])) };
    const previous = global.fetch; let mismatch = false, changed = false, requests = 0;
    global.fetch = async (url, options) => {
        assert(String(url).startsWith(REMOTE_SOURCE)); assert.equal(options.credentials, 'omit');
        if (String(url).endsWith('manifest.json')) return new Response(JSON.stringify({ ...manifest, generatedAt: changed && requests++ ? 'new-version' : manifest.generatedAt }));
        const category = String(url).split('/').pop().replace('.json', '');
        return new Response(JSON.stringify([{ id: category, name: category, category: mismatch ? 'race' : category }]));
    };
    try {
        const pack = await downloadRemotePack(new AbortController().signal, () => {});
        assert.equal(pack.originals.length, 7);
        mismatch = true; await assert.rejects(downloadRemotePack(new AbortController().signal, () => {}), /不一致/); mismatch = false;
        changed = true; requests = 0; await assert.rejects(downloadRemotePack(new AbortController().signal, () => {}), /更新/); changed = false;
        const controller = new AbortController();
        await assert.rejects(downloadRemotePack(controller.signal, message => { if (message.includes('下载')) controller.abort(); }), /abort/i);
    } finally { global.fetch = previous; }
});

test('resource manager renders package, quota and search-independent cache controls', () => {
    const { ResourceManagerPanel } = load('components/ResourceManagerPanel.tsx');
    const markup = renderToStaticMarkup(React.createElement(ResourceManagerPanel, { onActivate: () => {}, authorBytes: 2048 }));
    assert(markup.includes('浏览器缓存占用'));
    assert(markup.includes('获取 4E NEXT 初始资料'));
    assert(markup.includes('导入资料包'));
    assert(markup.includes('配额由浏览器决定'));
    assert(markup.includes('2.0 KB'));
});

test('editable PNGs preserve Unicode, nested data and unknown fields; corrupt or ordinary images reject', () => {
    const { embedCardPNG, readCardPNG, crc32 } = load('utils/card-png.ts');
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
    const png = testPNG();
    const item = createResource('traditions'); item.name = '踏雪 · 中文'; item.custom = { text: '保留未知字段' }; item.headerColor = '#123ABC'; item.powers[0].headerColor = '#456DEF';
    const archive = makeArchive({ traditions: [item] });
    const encoded = embedCardPNG(png, archive);
    assert.deepEqual(readCardPNG(encoded), archive);
    assert.deepEqual(readArchive(readCardPNG(encoded)).traditions[0], item);
    const changed = { ...archive, exportedAt: 'updated' };
    assert.deepEqual(readCardPNG(embedCardPNG(encoded, changed)), changed);
    assert.throws(() => readCardPNG(png), /普通截图/);
    const corrupt = encoded.slice(); corrupt[corrupt.length - 13] ^= 1;
    assert.throws(() => readCardPNG(corrupt), /校验/);
    assert.throws(() => readCardPNG(encoded.subarray(0, encoded.length - 3)), /完整/);
});

test('card ZIP imports deduplicate image and JSON pairs and reject ambiguous IDs and excessive entries', () => {
    const { readCardBytes, packFiles } = load('utils/card-files.ts');
    const item = createResource('moves'); item.name = '测试单卡'; item.headerColor = '#123ABC';
    const archive = makeArchive({ moves: [item] });
    const encode = value => new TextEncoder().encode(JSON.stringify(value));
    const { embedCardPNG } = load('utils/card-png.ts');
    const zip = packFiles({ 'one.json': encode(archive), 'same-card.png': embedCardPNG(testPNG(), archive), 'duplicate.json': encode(archive), 'README.txt': encode('说明') });
    const result = readCardBytes(zip, 'cards.zip'); assert.equal(result.data.moves.length, 1);
    assert.equal(result.data.moves[0].headerColor, '#123ABC');
    const second = makeArchive({ moves: [{ ...item, name: '不同的内容' }] });
    assert.throws(() => readCardBytes(packFiles({ 'one.json': encode(archive), 'two.json': encode(second) }), 'cards.zip'), /数据不同/);
    assert.throws(() => readCardBytes(packFiles(Object.fromEntries(Array.from({ length: 501 }, (_, index) => [`${index}.json`, encode(archive)]))), 'many.zip'), /500/);
    assert.throws(() => readCardBytes(encode({ ...archive, schemaVersion: 2 }), 'future.json'), /版本/);
});

test('direct 4E JSON imports map only the selected tool and preserve embedded references', () => {
    const { readCardValue } = load('utils/card-files.ts');
    const power = { id: 'p', name: '原版招式', category: 'power', usage: 'encounter', actionType: '标准动作', level: '11', details: '<table><tr><th>效果：</th><td>保留完整效果</td></tr></table>' };
    const path = { id: 'path', name: '原版传承', category: 'paragon-path', wiki: { transclusions: ['p'] }, sourceText: '!! 11级：能力\n能力正文\n{{p}}' };
    assert.throws(() => readCardValue(power), /对应工具/);
    assert.throws(() => readCardValue(power, 'items'), /当前工具/);
    const imported = readCardValue([power, path], 'traditions');
    assert.equal(imported.data.traditions.length, 1);
    assert.equal(imported.data.traditions[0].powers[0].templateReference.entryId, 'p');
    assert.equal(imported.data.traditions[0].templateReference.originalJSON, JSON.stringify(path));
});

test('standalone power archives match their rendered card and keep parent resources separate', () => {
    const { cardArchive } = load('utils/card-image.ts');
    const { CardContent } = load('components/Preview.tsx');
    const parent = createResource('paths'); parent.name = '成道测试'; parent.powers[0].name = '独立威能';
    const power = parent.powers[0];
    assert.equal(cardArchive('paths', parent, `power:${power.id}`).data.moves[0].id, power.id);
    assert.equal(cardArchive('paths', parent, 'summary').data.paths[0].id, parent.id);
    const markup = renderToStaticMarkup(React.createElement(CardContent, { module: 'paths', item: parent, format: `power:${power.id}` }));
    assert(markup.includes('独立武学招式')); assert(!markup.includes('成道测试'));
    assert.equal(duplicateResource(parent).templateReference, undefined);
});

test('author information remains complete in its compact layout', () => {
    const { DisclaimerModal } = load('components/DisclaimerModal.tsx');
    const markup = renderToStaticMarkup(React.createElement(DisclaimerModal, { onClose: () => {} }));
    for (const value of ['哈基米德', '基德', 'Antigravity Gemini', 'Codex GPT', '261751459', '691707475', 'nogubird.top', 'ifdian.net/a/nogubird', '严禁商业用途', 'DND4E']) assert(markup.includes(value));
    assert(markup.includes('author-dialog'));
});

test('reference vocabulary has valid categories, preserved wuxia words and stable rule codes', () => {
    const terms = validateTerminology(defaultTerminology());
    assert(terms.entries.some(term => term.category === 'damage' && term.original === '火焰' && term.label === '纯阳'));
    assert(terms.entries.some(term => term.category === 'damage' && term.label === '罡劲'));
    assert(terms.entries.some(term => term.category === 'weapon' && term.label === '长剑'));
    assert(terms.entries.some(term => term.category === 'status' && term.label === '倒地'));
    assert.equal(terms.entries.find(term => term.category === 'defense' && term.label === '格挡').value, 'AC');
    const extended = addTerms(terms, 'damage', ' 焰劲，焰劲,火焰；雷劲 ');
    assert.equal(extended.entries.length, terms.entries.length + 2);
    assert.equal(addTerms(extended, 'damage', '焰劲'), extended);
    assert.equal(addTerms(extended, 'usage', '无限'), extended);
});

test('vocabulary backup, standalone import and legacy storage preserve resources', () => {
    const db = emptyDB(); db.moves = [createResource('moves')];
    const terms = addTerms(defaultTerminology(), 'weapon', '青玉剑');
    terms.autoCollect = false;
    const envelope = makeArchive(db, terms);
    const restored = readLibraryArchive(JSON.parse(JSON.stringify(envelope)));
    assert.deepEqual(restored.data, db); assert.deepEqual(restored.terminology, terms);
    assert.deepEqual(readLibraryArchive(makeArchive({}, terms)).data, {});
    const port = storage(); assert(saveLibrary(port, db, terms).ok);
    assert.deepEqual(loadLibrary(port).terminology, terms);
    const old = loadLibrary(storage({ [STORAGE_KEY]: JSON.stringify(makeArchive(db)) }));
    assert.deepEqual(old.db, db); assert.deepEqual(old.terminology, defaultTerminology());
    assert.throws(() => readLibraryArchive({ ...envelope, terminology: { version: 99 } }), /术语/);
    const corrupt = loadLibrary(storage({ [STORAGE_KEY]: JSON.stringify({ ...envelope, terminology: { version: 99 } }) }));
    assert.equal(corrupt.issues.length, 1); assert.equal(corrupt.db.moves[0].id, db.moves[0].id);
    assert(corrupt.recovery[STORAGE_KEY].includes('99'));
});

test('term import retains local renames and card snapshots survive vocabulary changes', () => {
    const local = defaultTerminology();
    local.entries.find(term => term.value === 'AC').label = '金钟罩';
    const incoming = addTerms(defaultTerminology(), 'damage', '焰劲');
    const merged = mergeTerminology(local, incoming);
    assert.equal(merged.entries.find(term => term.value === 'AC').label, '金钟罩');
    assert(merged.entries.some(term => term.label === '焰劲'));
    const card = createResource('moves'); card.att = '力量'; card.def = 'AC'; card.defLabel = '旧格挡'; card.actionLabel = '旧出招';
    const restored = readArchive(makeArchive({ moves: [card] })).moves[0];
    const html = renderToStaticMarkup(React.createElement(PowerCard, { item: restored }));
    assert(html.includes('格挡')); assert(html.includes('出招')); assert(!html.includes('旧格挡')); assert(!html.includes('旧出招')); assert.equal(restored.defLabel, '旧格挡');
    assert.throws(() => validateTerminology({ ...local, entries: [...local.entries, local.entries[0]] }), /重复/);
});

test('renamed and hidden suggestions retain legacy selection and authored labels', () => {
    const terms = defaultTerminology();
    const defense = terms.entries.find(term => term.value === 'AC'); defense.label = '金钟罩'; defense.replacement = '金钟罩';
    const render = props => renderToStaticMarkup(React.createElement(TerminologyContext.Provider,
        { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(TermSelect, props)));
    const legacy = render({ label: '防御', category: 'defense', value: 'AC', onChange: () => {} });
    assert(!legacy.includes('卡片原有名称')); assert(legacy.includes('金钟罩'));
    defense.hidden = true;
    const snapshot = render({ label: '防御', category: 'defense', value: 'AC', snapshot: '旧名称', onChange: () => {} });
    assert(!snapshot.includes('旧名称')); assert(snapshot.includes('金钟罩'));
    const custom = render({ label: '防御', category: 'defense', value: '新防御', onChange: () => {} });
    assert(custom.includes('新防御（卡片原有值）'));
});

test('collecting a term in the same event does not discard the latest resource draft', () => {
    const originals = { window: global.window, state: React.useState, ref: React.useRef, effect: React.useEffect };
    const port = storage(); global.window = { localStorage: port };
    React.useState = initial => [typeof initial === 'function' ? initial() : initial, () => {}];
    React.useRef = initial => ({ current: initial }); React.useEffect = () => {};
    try {
        const library = load('hooks/useLibrary.ts').useLibrary();
        const db = emptyDB(); const move = createResource('moves'); move.hit = '刚输入的新规则'; db.moves = [move];
        library.update(db); library.collect('damage', '焰劲');
        const saved = loadLibrary(port);
        assert.equal(saved.db.moves[0].hit, '刚输入的新规则');
        assert(saved.terminology.entries.some(term => term.label === '焰劲'));
        library.updateTerminology({ ...saved.terminology, autoCollect: false });
        library.collect('damage', '不自动记录');
        assert(!loadLibrary(port).terminology.entries.some(term => term.label === '不自动记录'));
        library.collect('damage', '手动记录', true);
        assert(loadLibrary(port).terminology.entries.some(term => term.label === '手动记录'));
    } finally {
        if (originals.window === undefined) delete global.window; else global.window = originals.window;
        React.useState = originals.state; React.useRef = originals.ref; React.useEffect = originals.effect;
    }
});

test('navigation gives list and workbench distinct identities across populated and empty modules', () => {
    const libraryModule = load('hooks/useLibrary.ts');
    const originalLibrary = libraryModule.useLibrary;
    const originalState = React.useState;
    const originalEffect = React.useEffect; React.useEffect = () => {};
    const db = emptyDB();
    db.schools = [createResource('schools')];
    const states = [];
    let cursor = 0;
    React.useState = initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
    };
    libraryModule.useLibrary = () => ({ db, issues: [], recovery: {}, blocked: false, dirty: false, error: '' });
    try {
        const App = load('App.tsx').default;
        const { Sidebar } = load('components/Sidebar.tsx');
        const { Editor } = load('components/Editor.tsx');
        const { Preview } = load('components/Preview.tsx');
        const { EditorWorkbench } = load('components/EditorWorkbench.tsx');
        const find = (element, predicate) => {
            if (!React.isValidElement(element)) return undefined;
            if (predicate(element)) return element;
            for (const child of React.Children.toArray(element.props.children).concat([element.props.editor, element.props.preview])) {
                const result = find(child, predicate);
                if (result) return result;
            }
        };
        const render = () => { cursor = 0; return App(); };
        let tree = render();
        for (const module of ['schools', 'moves', 'roots', 'origins', 'paths', 'schools', 'moves']) {
            find(tree, element => element.type === Sidebar).props.onSwitchModule(module);
            tree = render();
            const main = find(tree, element => element.type === 'main');
            const panels = main.props.children.props.children;
            assert.equal(panels.length, 2);
            assert.equal(new Set(panels.map(panel => panel.key)).size, 2, 'sibling keys must be unique');
            const workbench = panels.find(panel => panel.type === EditorWorkbench);
            assert.equal(workbench.props.resourceId, `${module}:${db[module][0]?.id ?? 'empty'}`);
            const editor = find(workbench, panel => panel.type === Editor);
            const preview = find(workbench, panel => panel.type === Preview);
            assert.equal(editor.props.module, module);
            assert.equal(editor.props.item, db[module][0] ?? null);
            assert.equal(preview.props.item, editor.props.item);
        }
        find(tree, element => element.type === Sidebar).props.onGoHome();
        tree = render();
        assert.equal(find(tree, element => element.type === Editor), undefined);
        assert.equal(find(tree, element => element.type === Preview), undefined);
        assert.equal(db.moves.length, 0, 'navigation must not create placeholder resources');
    } finally {
        React.useState = originalState;
        React.useEffect = originalEffect;
        libraryModule.useLibrary = originalLibrary;
    }
});

test('editing keeps saved cards intact until overwrite, copy or named save-as is chosen', () => {
    const libraryModule = load('hooks/useLibrary.ts');
    const originalLibrary = libraryModule.useLibrary, originalState = React.useState, originalEffect = React.useEffect;
    let db = emptyDB(); const original = createResource('moves'); original.name = '原卡'; db.moves = [original];
    const states = []; let cursor = 0;
    React.useState = initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; };
    React.useEffect = () => {};
    libraryModule.useLibrary = () => ({ db, terminology: defaultTerminology(), blocked: false, dirty: false, issues: [], update: next => { db = next; } });
    const find = (element, predicate) => { if (!React.isValidElement(element)) return; if (predicate(element)) return element; for (const child of React.Children.toArray(element.props.children).concat([element.props.editor, element.props.preview])) { const found = find(child, predicate); if (found) return found; } };
    try {
        const App = load('App.tsx').default, { Editor } = load('components/Editor.tsx'), { Sidebar } = load('components/Sidebar.tsx'), { SaveAsDialog } = load('components/SaveAsDialog.tsx');
        const render = () => { cursor = 0; return App(); };
        const button = (tree, text) => find(tree, element => element.type === 'button' && (element.props.children === text || element.props.children?.props?.children === text));
        let tree = render(); find(tree, element => element.type === Sidebar).props.onSwitchModule('moves'); tree = render();
        find(tree, element => element.type === Editor).props.onChange({ ...original, name: '新风味' }); tree = render();
        assert.equal(db.moves[0].name, '原卡');
        const { ListPanel } = load('components/ListPanel.tsx');
        const draftList = find(tree, element => element.type === ListPanel);
        assert.equal(draftList.props.colorBlocked, true);
        draftList.props.onApplyColor([original.id], '#112233', false);
        assert.equal(db.moves[0].headerColor, undefined, 'batch application must not overwrite or save an active draft');
        draftList.props.onDuplicate(original.id); tree = render();
        assert.equal(db.moves.length, 2); assert.equal(db.moves.find(item => item.id === original.id).name, '原卡');
        const copy = db.moves[0]; assert.notEqual(copy.id, original.id);
        find(tree, element => element.type === Editor).props.onChange({ ...copy, name: '另存草稿' }); tree = render();
        button(tree, '另存为…').props.onClick(); tree = render();
        find(tree, element => element.type === SaveAsDialog).props.onSave('独立新卡'); tree = render();
        assert.equal(db.moves.length, 3); assert.equal(db.moves.find(item => item.id === copy.id).name, copy.name); assert.equal(db.moves[0].name, '独立新卡');
        const saved = db.moves[0]; find(tree, element => element.type === Editor).props.onChange({ ...saved, name: '覆盖后的名字' }); tree = render();
        button(tree, '保存').props.onClick(); tree = render();
        assert.equal(db.moves.length, 3); assert.equal(db.moves.find(item => item.id === saved.id).name, '覆盖后的名字');
        const savedList = find(tree, element => element.type === ListPanel);
        assert.equal(savedList.props.colorBlocked, false);
        savedList.props.onApplyColor([saved.id], '#112233', false); tree = render();
        assert.equal(db.moves.find(item => item.id === saved.id).headerColor, '#112233');
        find(tree, element => element.type === Editor).props.onChange({ ...db.moves[0], name: '不应偷偷保存' }); tree = render();
        find(tree, element => element.type === Sidebar).props.onSwitchModule('paths'); tree = render();
        assert.equal(find(tree, element => element.type === Editor).props.module, 'moves');
        button(tree, '放弃修改').props.onClick(); tree = render();
        assert.equal(find(tree, element => element.type === Editor).props.module, 'paths'); assert.equal(db.moves[0].name, '覆盖后的名字');
    } finally { React.useState = originalState; React.useEffect = originalEffect; libraryModule.useLibrary = originalLibrary; }
});

test('denied browser storage getter reports failure without crashing', () => {
    const previous = global.window;
    global.window = Object.defineProperty({}, 'localStorage', { get() { throw new Error('access denied'); } });
    try {
        assert.equal(loadLibrary(browserStorage).issues.length, 1);
        assert.equal(saveLibrary(browserStorage, emptyDB()).ok, false);
    } finally { if (previous === undefined) delete global.window; else global.window = previous; }
});

test('global search trims input and finds nested rules across libraries', () => {
    const db = emptyDB();
    const move = createResource('moves');
    move.name = 'Blade';
    db.moves = [move];
    const path = createResource('paths');
    path.powers[0].effect = '嵌入效果';
    db.paths = [path];
    assert.deepEqual(searchResources(db, '   '), []);
    assert.equal(searchResources(db, ' BLADE ')[0].item.id, move.id);
    assert.equal(searchResources(db, '嵌入效果')[0].module, 'paths');
    assert.deepEqual(searchResources(db, move.id), []);
});

test('card format falls back when an embedded power is removed', () => {
    const power = createResource('moves');
    const selected = `power:${power.id}`;
    assert.equal(resolveCardFormat(selected, [power]), selected);
    assert.equal(resolveCardFormat(selected, []), 'full');
    assert.equal(resolveCardFormat('summary', []), 'summary');
});

test('import preview agrees with actual merge for existing and incoming duplicate IDs', () => {
    const db = emptyDB();
    const existing = createResource('moves');
    const fresh = createResource('moves');
    db.moves = [existing];
    const incoming = { moves: [existing, fresh, fresh] };
    for (const mode of ['skip', 'overwrite', 'copy']) {
        const { added, replaced, skipped } = mergeResources(db, incoming, mode);
        assert.deepEqual(summarizeImport(db, incoming, mode), { added, replaced, skipped });
    }
    assert.equal(db.moves.length, 1);
    assert.equal(incoming.moves[1].id, fresh.id);
});
test('legacy JSON migrates levels and display labels without losing extensions', () => {
    const parsed = readArchive({ moves: [{ id: 'old', name: '招式', level: '7', action: '标准动作', def: '格挡', extension: { text: '第三方数据' } }] });
    assert.equal(parsed.moves[0].level, 7); assert.equal(parsed.moves[0].action, 'std'); assert.equal(parsed.moves[0].def, 'AC');
    assert.equal(parsed.moves[0].extension.text, '第三方数据'); assert.deepEqual(readArchive(makeArchive(parsed)), parsed);
});
test('invalid nested resources and future versions reject the whole import', () => {
    assert.throws(() => readArchive({ schemaVersion: 2, data: {} }), /不支持/);
    assert.throws(() => readArchive({ moves: [{ name: '有效' }], traditions: [{ name: '传承', powers: [null] }] }), /必须是对象/);
    assert.throws(() => readArchive({ moves: [{ name: '招式', hit: {} }] }), /必须是文本/);
    assert.throws(() => readArchive({ items: [{ name: '物品', level: -1 }] }), /非负整数/);
    assert.throws(() => readArchive({ moves: [null] }), /必须是对象/);
    assert.throws(() => readArchive({ other: [] }), /可识别/);
});
test('repeat import respects all modes and duplicates inside the file', () => {
    const item = createResource('moves'); item.name = '本地'; const db = { ...emptyDB(), moves: [item] };
    const incoming = { moves: [{ ...item, name: '导入' }, { ...item, name: '第二份' }] };
    const skip = mergeResources(db, incoming, 'skip'); assert.equal(skip.skipped, 2); assert.equal(skip.db.moves[0].name, '本地');
    const replace = mergeResources(db, incoming, 'overwrite'); assert.equal(replace.db.moves.length, 1); assert.equal(replace.db.moves[0].name, '第二份');
    const copy = mergeResources(db, incoming, 'copy'); assert.equal(copy.db.moves.length, 3); assert.equal(new Set(copy.db.moves.map(item => item.id)).size, 3);
    assert.equal(db.moves[0].name, '本地');
});
test('legacy storage reads without writes and nested IDs stay stable after save', () => {
    const raw = JSON.stringify([{ id: 'school', name: '门派', features: [{ name: '特性', desc: '说明' }] }]);
    const port = storage({ db_schools_v1: raw }); const loaded = loadLibrary(port);
    assert.equal(loaded.issues.length, 0); assert(loaded.db.schools[0].features[0].id); assert.equal(port.values.size, 1);
    assert.equal(saveLibrary(port, loaded.db).ok, true); assert.equal(port.values.get('db_schools_v1'), raw);
    assert.deepEqual(loadLibrary(port).db, loaded.db);
});
test('corrupt storage preserves exact recovery bytes and other usable libraries', () => {
    const port = storage({ db_moves_v5: '{bad', db_roots_v5: JSON.stringify([{ name: '根骨' }]) }); const loaded = loadLibrary(port);
    assert.equal(loaded.issues.length, 1); assert.equal(loaded.recovery.db_moves_v5, '{bad'); assert.equal(loaded.db.roots.length, 1); assert(!port.values.has(STORAGE_KEY));
    assert.equal(loadLibrary(storage({ [STORAGE_KEY]: '{broken' })).recovery[STORAGE_KEY], '{broken');
});
test('quota failure leaves saved bytes intact with an actionable error', () => {
    const port = storage(); const db = emptyDB(); saveLibrary(port, db); const before = port.values.get(STORAGE_KEY);
    port.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
    const result = saveLibrary(port, { ...db, moves: [createResource('moves')] });
    assert.equal(result.ok, false); assert.match(result.error, /尚未保存/); assert.equal(port.values.get(STORAGE_KEY), before);
});
test('copy refreshes nested IDs and search includes nested rules', () => {
    const item = createResource('traditions'); item.powers[0].rules = [{ id: 'rule', title: '强化二', text: '特殊命中效果' }]; const copy = duplicateResource(item);
    assert.notEqual(copy.id, item.id); assert.notEqual(copy.powers[0].id, item.powers[0].id); assert.notEqual(copy.features[0].id, item.features[0].id);
    assert.notEqual(copy.powers[0].rules[0].id, 'rule'); assert.match(resourceSearchText(copy), /特殊命中效果/);
});
test('continuous range edits preserve shape and independent area reach', () => {
    let value = buildRange({ type: 'Area', shape: 'Blast', distance: '', reach: '15' }); value = buildRange({ ...parseRange(value), distance: '3' });
    assert.deepEqual(parseRange(value), { type: 'Area', shape: 'Blast', distance: '3', reach: '15' });
    assert.equal(parseRange('近战 兵器').distance, '兵器'); assert.equal(parseRange('区域爆发(圆形) 1 (10格内)').distance, '1');
});
test('Markdown emphasis works with inert HTML and blocked active links', () => {
    const html = renderToStaticMarkup(React.createElement(RichText, { text: '**说明**\n<img src=x onerror=alert(1)> [点击](javascript:alert(1))' }));
    assert(html.includes('<strong>说明</strong>')); assert(!html.includes('<img')); assert(!html.includes('href="javascript:')); assert(html.includes('&lt;img'));
});
test('complex powers round-trip and appear in full and standalone cards', () => {
    const item = createResource('paths'); item.powers[0].name = '招式'; item.powers[0].level = 20; item.powers[0].acquiredLevel = '26';
    item.powers[0].rules = [{ id: 'secondary', title: '次攻击', text: '第二目标\n后续效果' }]; item.culmination = '终局说明';
    const restored = readArchive(makeArchive({ paths: [item] })).paths[0];
    const full = renderToStaticMarkup(React.createElement(ProgressionCard, { module: 'paths', item: restored }));
    const summary = renderToStaticMarkup(React.createElement(ProgressionCard, { module: 'paths', item: restored, summaryOnly: true }));
    const power = renderToStaticMarkup(React.createElement(PowerCard, { item: restored.powers[0] }));
    assert(full.includes('后续效果')); assert(power.includes('后续效果')); assert(!summary.includes('后续效果')); assert(summary.includes('终局说明'));
    assert(full.includes('26级获得')); assert.equal(restored.powers[0].level, 20);
});
test('empty progression omits placeholders and level zero survives migration', () => {
    const html = renderToStaticMarkup(React.createElement(ProgressionCard, { module: 'traditions', item: createResource('traditions') }));
    assert(!html.includes('未命名威能')); assert(!html.includes('未命名特性')); assert.equal(normalizeResource('moves', { name: '', level: 0 }).level, 0);
});

const { setReplacement, createTermTranslator } = load('utils/term-display.ts');
test('global mappings update old card display, clear to originals, preserve data and portable settings', () => {
    const initial = defaultTerminology();
    const id = initial.entries.find(t => t.category === 'resource' && t.original === '威能').id;
    const mapped = validateTerminology(setReplacement(initial, id, '招式'));
    assert.equal(createTermTranslator(mapped)('威能 / 武学招式'), '招式 / 招式');
    const cleared = validateTerminology(setReplacement(mapped, id, ''));
    assert.equal(createTermTranslator(cleared)('威能 / 武学招式 / 招式'), '威能 / 威能 / 威能');
    const item = createResource('moves'); item.name = '测试威能'; item.hit = '此威能造成火焰伤害。';
    const snapshot = structuredClone(item);
    const render = terms => renderToStaticMarkup(React.createElement(TerminologyContext.Provider, { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(PowerCard, { item })));
    assert(render(mapped).includes('测试招式')); assert(render(mapped).includes('此招式造成纯阳伤害'));
    assert(render(cleared).includes('测试威能')); assert.deepEqual(item, snapshot);
    const archive = readLibraryArchive(makeArchive({ moves: [item] }, mapped));
    assert.equal(createTermTranslator(archive.terminology)('威能'), '招式');
});
test('pairing existing wuxia words persists and old aliases return to the standard term', () => {
    const initial = defaultTerminology();
    const id = initial.entries.find(t => t.category === 'damage' && t.original === '火焰').id;
    const mapped = validateTerminology(setReplacement(initial, id, '纯阳'));
    assert.equal(createTermTranslator(mapped)('火焰 / 纯阳'), '纯阳 / 纯阳');
    const cleared = validateTerminology(setReplacement(mapped, id, ''));
    const loaded = validateTerminology(JSON.parse(JSON.stringify(cleared)));
    assert.equal(createTermTranslator(loaded)('火焰 / 纯阳'), '火焰 / 火焰');
    assert.equal(createTermTranslator(mapped, true)('纯阳伤害'), '火焰伤害');
});
test('legacy vocabulary upgrades without losing rename, hidden preferences or custom words', () => {
    const legacy = { version: 1, autoCollect: false, entries: [{ id: 'defense:AC', category: 'defense', value: 'AC', label: '金钟罩', origin: 'wuxia', hidden: true }, { id: 'custom', category: 'damage', value: '星辉', label: '星辉', origin: 'custom' }] };
    const upgraded = validateTerminology(legacy);
    assert.equal(upgraded.entries.find(t => t.value === 'AC').original, '护甲等级');
    assert.equal(upgraded.entries.find(t => t.value === 'AC').replacement, '金钟罩');
    assert.equal(createTermTranslator(upgraded)('AC / 格挡'), '金钟罩 / 金钟罩');
    assert(upgraded.entries.some(t => t.value === '星辉'));
    assert.equal(upgraded.autoCollect, false);
    assert(upgraded.entries.some(t => t.category === 'resource' && t.value === '威能'));
    assert.throws(() => validateTerminology({ ...upgraded, entries: [{ ...upgraded.entries[0], replacement: 42 }] }), /字段/);
});
test('display replacement preserves markdown destinations, code and abbreviation boundaries', () => {
    let terms = defaultTerminology();
    terms = setReplacement(terms, terms.entries.find(t => t.category === 'resource' && t.original === '威能').id, '<招式>');
    const html = renderToStaticMarkup(React.createElement(TerminologyContext.Provider, { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(RichText, { text: '[威能](https://example.org/威能) `威能` **威能**' })));
    assert(html.includes('href="https://example.org/威能"')); assert(html.includes('&lt;招式&gt;')); assert(html.includes('<code>威能</code>'));
    assert.equal(createTermTranslator(terms)('CLASS AC'), 'CLASS 格挡');
    assert.equal(createTermTranslator(terms)('MACRO'), 'MACRO');
});

test('clearing structured frequency and defense names uses 4E standards rather than internal codes', () => {
    let terms = defaultTerminology();
    for (const category of ['usage', 'defense', 'action']) {
        for (const term of terms.entries.filter(t => t.category === category)) terms = setReplacement(terms, term.id, '');
    }
    const card = createResource('moves'); card.type = 'basic'; card.action = 'std'; card.att = '力量'; card.def = 'AC';
    const markup = renderToStaticMarkup(React.createElement(TerminologyContext.Provider, { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(PowerCard, { item: card })));
    assert(markup.includes('随意')); assert(markup.includes('标准动作')); assert(markup.includes('护甲等级')); assert(!markup.includes('basic'));
});

test('search matches current display names and retains original text queries', () => {
    let terms = defaultTerminology();
    terms = setReplacement(terms, terms.entries.find(t => t.category === 'resource' && t.original === '威能').id, '招式');
    const db = emptyDB(); const card = createResource('moves'); card.name = '测试威能'; card.def = 'AC'; db.moves = [card];
    const display = createTermTranslator(terms);
    assert.equal(searchResources(db, '招式', display)[0].item.id, card.id);
    assert.equal(searchResources(db, '威能', display)[0].item.id, card.id);
    assert.equal(searchResources(db, '格挡', display)[0].item.id, card.id);
});

test('approved wuxia defaults cover all damage and effect mappings without duplicate suggestions', () => {
    const { WuxiaMappings } = load('utils/terminology.ts');
    const terms = validateTerminology(defaultTerminology());
    for (const [category, original, replacement] of WuxiaMappings) {
        const entries = terms.entries.filter(term => term.category === category && term.label === replacement);
        assert.equal(entries.length, 1, original);
        assert.equal(entries[0].original, original);
        assert.equal(createTermTranslator(terms, false, category)(original), replacement);
    }
    assert.equal(createTermTranslator(terms)('反射 身法 移动动作 强酸'), '身法 身法 移动 腐蚀');
    assert.equal(createTermTranslator(terms, true)('身法'), '反射');
    assert.equal(createTermTranslator(terms)('即时打断 即时反应 借机动作 无动作'), '即时打断 即时反应 借机动作 无动作');
    assert(terms.entries.some(term => term.value === '奇门'));
});
test('old vocabulary receives defaults once and preserves authored replacements, cleared values and standalone edits', () => {
    const terms = defaultTerminology(); delete terms.presetRevision;
    const fire = terms.entries.find(term => term.category === 'damage' && term.value === '火焰');
    fire.label = '火焰'; fire.replacement = ''; fire.aliases = [];
    terms.entries.push({ id: 'wuxia:damage:纯阳', category: 'damage', value: '纯阳', original: '纯阳', replacement: '', label: '纯阳', aliases: [], origin: 'wuxia' });
    const poison = terms.entries.find(term => term.category === 'damage' && term.value === '毒素');
    poison.replacement = '剧毒'; poison.label = '剧毒'; poison.hidden = true;
    const movement = terms.entries.find(term => term.category === 'action' && term.value === 'mov');
    movement.replacement = '身法'; movement.label = '身法'; movement.aliases = ['身法'];
    const snapshot = structuredClone(terms);
    const upgraded = validateTerminology(terms);
    assert.deepEqual(terms, snapshot);
    assert.equal(upgraded.entries.find(term => term.value === '火焰').replacement, '纯阳');
    assert.equal(upgraded.entries.find(term => term.value === '毒素').replacement, '剧毒');
    assert.equal(upgraded.entries.find(term => term.value === '毒素').hidden, true);
    assert.equal(upgraded.entries.find(term => term.value === 'mov').replacement, '移动');
    assert.equal(createTermTranslator(upgraded, true)('身法'), '反射');
    const cleared = validateTerminology(setReplacement(upgraded, fire.id, ''));
    const loaded = validateTerminology(JSON.parse(JSON.stringify(cleared)));
    assert.equal(loaded.entries.find(term => term.value === '火焰').replacement, '');
    assert.equal(createTermTranslator(loaded)('纯阳'), '火焰');
});
test('effect keywords and range fields keep separate meanings and old movement snapshots use mov', () => {
    const terms = defaultTerminology();
    const card = createResource('moves'); card.action = 'mov'; card.actionLabel = '身法'; card.att = '力量'; card.def = 'Reflex';
    card.keywords = '区域，强酸'; card.range = '区域爆发 2（10格内）'; card.hit = '造成强酸伤害并创造区域';
    const markup = renderToStaticMarkup(React.createElement(TerminologyContext.Provider, { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(PowerCard, { item: card })));
    assert(markup.includes('阵法，腐蚀')); assert(markup.includes('区域爆发')); assert(!markup.includes('阵法爆发'));
    assert(markup.includes('移动')); assert(markup.includes('身法')); assert(markup.includes('腐蚀伤害并创造阵法'));
    assert.equal(card.actionLabel, '身法');
});

test('upgrading a renamed wuxia suggestion transfers its authored name into the standard mapping', () => {
    const terms = defaultTerminology(); delete terms.presetRevision;
    const fire = terms.entries.find(term => term.category === 'damage' && term.value === '火焰');
    fire.label = '火焰'; fire.replacement = ''; fire.aliases = [];
    terms.entries.push({ id: 'wuxia:damage:纯阳', category: 'damage', value: '纯阳', original: '纯阳', replacement: '阳炎', label: '阳炎', aliases: ['纯阳'], hidden: true, origin: 'wuxia' });
    const upgraded = validateTerminology(terms);
    const mapped = upgraded.entries.find(term => term.value === '火焰');
    assert.equal(mapped.label, '阳炎'); assert.equal(mapped.hidden, true);
    assert.equal(createTermTranslator(upgraded)('火焰 纯阳 阳炎'), '阳炎 阳炎 阳炎');
    assert.equal(addTerms(upgraded, 'damage', '纯阳'), upgraded);
    assert.equal(upgraded.entries.filter(term => term.category === 'damage' && term.label === '阳炎').length, 1);
});

test('editor text translation and inverse conversion preserve authored URLs and code', () => {
    const terms = defaultTerminology();
    const value = '火焰伤害 [火焰](https://example.org/纯阳/火焰) `火焰`';
    const display = createTermTranslator(terms);
    const canonical = createTermTranslator(terms, true);
    assert.equal(display(value), '纯阳伤害 [纯阳](https://example.org/纯阳/火焰) `火焰`');
    assert.equal(canonical(display(value)), value);
});

test('pre-mapping vocabulary without original fields fills confirmed presets during archive load', () => {
    const entries = ['强酸', '寒冰', '火焰'].map(label => ({ id: `4e:damage:${label}`, category: 'damage', value: label, label, origin: '4e' }));
    entries.push({ id: 'wuxia:damage:纯阳', category: 'damage', value: '纯阳', label: '纯阳', origin: 'wuxia' });
    const old = { version: 1, autoCollect: true, entries };
    const db = emptyDB(); db.moves = [createResource('moves')];
    const raw = JSON.stringify({ ...makeArchive(db), terminology: old });
    const port = storage({ [STORAGE_KEY]: raw });
    const loaded = loadLibrary(port);
    assert.deepEqual(loaded.issues, []);
    for (const [original, replacement] of [['强酸','腐蚀'], ['寒冰','纯阴'], ['火焰','纯阳']]) assert.equal(loaded.terminology.entries.find(term => term.value === original).replacement, replacement);
    assert.equal(port.getItem(STORAGE_KEY), raw);
    assert.deepEqual(loaded.db, db);
    assert(saveLibrary(port, loaded.db, loaded.terminology).ok);
    assert.equal(loadLibrary(port).terminology.entries.find(term => term.value === '火焰').replacement, '纯阳');
});
test('explicit preset backfill repairs already marked incomplete libraries and preserves other names', () => {
    const { missingConfirmedMappings, fillConfirmedMappings } = load('utils/term-display.ts');
    let terms = defaultTerminology();
    for (const original of ['强酸','寒冰','火焰']) terms = setReplacement(terms, terms.entries.find(term => term.value === original && term.category === 'damage').id, '');
    terms = setReplacement(terms, terms.entries.find(term => term.value === '毒素' && term.category === 'damage').id, '剧毒');
    const zone = terms.entries.find(term => term.category === 'effect' && term.value === '区域');
    terms = setReplacement(terms, zone.id, '');
    terms = addTerms(terms, 'damage', '星辉');
    const snapshot = structuredClone(terms);
    assert.equal(missingConfirmedMappings(terms).length, 3);
    const filled = validateTerminology(fillConfirmedMappings(terms));
    assert.deepEqual(terms, snapshot);
    assert.equal(filled.entries.find(term => term.value === '强酸').replacement, '腐蚀');
    assert.equal(filled.entries.find(term => term.value === '火焰').replacement, '纯阳');
    assert.equal(filled.entries.find(term => term.value === '寒冰').replacement, '纯阴');
    assert.equal(filled.entries.find(term => term.value === '毒素').replacement, '剧毒');
    assert.equal(filled.entries.find(term => term.id === zone.id).replacement, '');
    assert(filled.entries.some(term => term.value === '星辉'));
    assert.equal(missingConfirmedMappings(filled).length, 0);
    assert.equal(fillConfirmedMappings(filled), filled);
    const cleared = validateTerminology(setReplacement(filled, filled.entries.find(term => term.value === '火焰').id, ''));
    assert.equal(validateTerminology(JSON.parse(JSON.stringify(cleared))).entries.find(term => term.value === '火焰').replacement, '');
});

test('terminology editor renders actual preset input values and a targeted repair for empty mappings', () => {
    const { TerminologyDialog } = load('components/TerminologyDialog.tsx');
    const render = terms => renderToStaticMarkup(React.createElement(TerminologyContext.Provider, { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(TerminologyDialog, { onClose: () => {} })));
    const initial = defaultTerminology();
    const markup = render(initial);
    assert.match(markup, /aria-label="置换：强酸"[^>]*value="腐蚀"/);
    assert.match(markup, /aria-label="置换：寒冰"[^>]*value="纯阴"/);
    assert.match(markup, /aria-label="置换：火焰"[^>]*value="纯阳"/);
    assert(!markup.includes('填入空缺的已确认置换'));
    const empty = setReplacement(initial, initial.entries.find(term => term.value === '强酸').id, '');
    const incomplete = render(empty);
    assert(incomplete.includes('填入空缺的已确认置换（1）'));
    assert(incomplete.includes('placeholder="留空使用原版称呼"'));
});


test('tool template picker limits all nine tools to their matching original category', () => {
    const { templatesForTool } = load('utils/tool-templates.ts');
    const entries = Object.keys(TemplateModules).map(category => ({ category, id: category }));
    const expected = { schools: 'class', moves: 'power', roots: 'race', origins: 'race', destinies: 'race', feats: 'feat', items: 'equipment', traditions: 'paragon-path', paths: 'epic-destiny' };
    for (const [module, category] of Object.entries(expected)) assert.deepEqual(templatesForTool(entries, module).map(entry => entry.category), [category]);
});

test('tool picker reads installed packs offline, follows active pack and preserves originals', async () => {
    const fake = require('fake-indexeddb');
    const previousDB = global.indexedDB, previousFetch = global.fetch;
    global.indexedDB = new fake.IDBFactory();
    global.fetch = () => { throw new Error('network forbidden'); };
    const { savePack, readPack, deletePack } = load('utils/template-cache.ts');
    const { cachedToolPack } = load('utils/tool-templates.ts');
    const { importTemplatePack, loadTemplate } = load('utils/template-loader.ts');
    const original = { id: 'offline-feat', name: '缓存专长', category: 'feat', sourceText: '完整原版规则' };
    const pack = { version: 1, sourceVersion: 'offline-v1', originals: [original] };
    try {
        assert.equal((await cachedToolPack()).pack, undefined);
        await savePack(pack, { id: 'one', name: '第一包', source: 'test' });
        await savePack({ ...pack, sourceVersion: 'offline-v2' }, { id: 'two', name: '第二包', source: 'test' });
        assert.equal((await cachedToolPack()).selected.id, 'two');
        const cached = await cachedToolPack('one');
        const index = importTemplatePack(cached.pack);
        const detail = await loadTemplate('/', index.entries[0], index, new AbortController().signal);
        const drafts = adaptTemplate(detail.original, 'feats', index.sourceVersion, detail.powers);
        assert.equal(drafts.length, 1);
        assert.equal(drafts[0].module, 'feats');
        assert.deepEqual((await readPack('one')).originals[0], original);
        await deletePack('one');
        await assert.rejects(cachedToolPack('one'), /已移除/);
    } finally { global.indexedDB = previousDB; global.fetch = previousFetch; }
});


test('resource list separates batch selection and keeps search through collapse', () => {
    const termModule = load('hooks/TerminologyContext.tsx'), colorModule = load('hooks/ColorLibraryContext.ts');
    const originalState = React.useState, originalTerms = termModule.useTerminology, originalColors = colorModule.useColorLibrary;
    const states = []; let cursor = 0, imported;
    React.useState = initial => { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; };
    termModule.useTerminology = () => ({ terminology: defaultTerminology() });
    colorModule.useColorLibrary = () => ({ colors: [] });
    const { ListPanel } = load('components/ListPanel.tsx');
    const first = { ...createResource('moves'), name: '第一招' }, second = { ...createResource('moves'), name: '第二招' };
    const all = (element, predicate) => !React.isValidElement(element) ? [] : [...(predicate(element) ? [element] : []), ...React.Children.toArray(element.props.children).flatMap(child => all(child, predicate))];
    const props = { items: [first, second], currentItemId: first.id, onCreate: () => {}, onTemplate: () => {}, onImport: file => { imported = file; }, onSelect: () => {}, onDelete: () => {}, onDuplicate: () => {}, onExportItems: () => {}, onBundle: () => {}, onApplyColor: () => {}, busy: false, colorBlocked: false };
    const render = () => { cursor = 0; return ListPanel(props); };
    try {
        let tree = render();
        assert.equal(all(tree, e => e.type === 'input' && e.props.type === 'checkbox').length, 0);
        all(tree, e => e.props['aria-label'] === '搜索当前资源库')[0].props.onChange({ target: { value: '第一' } }); tree = render();
        assert.equal(all(tree, e => e.type === 'details' && e.props.className === 'item-actions').length, 1);
        all(tree, e => e.type === 'button' && e.props.className.includes('batch-toggle'))[0].props.onClick(); tree = render();
        let checkbox = all(tree, e => e.type === 'input' && e.props.type === 'checkbox')[0];
        checkbox.props.onChange({ target: { checked: true } }); tree = render();
        assert.equal(all(tree, e => e.type === 'input' && e.props.type === 'checkbox')[0].props.checked, true);
        all(tree, e => e.props['aria-label'] === '收起资源列表')[0].props.onClick(); tree = render();
        assert.equal(all(tree, e => e.props['aria-label'] === '搜索当前资源库').length, 0);
        all(tree, e => e.props['aria-label'] === '展开资源列表')[0].props.onClick(); tree = render();
        assert.equal(all(tree, e => e.props['aria-label'] === '搜索当前资源库')[0].props.value, '第一');
        all(tree, e => e.type === 'button' && e.props.className.includes('batch-toggle'))[0].props.onClick(); tree = render();
        assert.equal(all(tree, e => e.type === 'input' && e.props.type === 'checkbox').length, 0);
        const file = { name: 'card.json' }, target = { files: [file], value: 'card.json' };
        all(tree, e => e.props['aria-label'] === '当前工具导入 JSON、PNG 或 ZIP')[0].props.onChange({ target });
        assert.equal(imported, file); assert.equal(target.value, '');
    } finally { React.useState = originalState; termModule.useTerminology = originalTerms; colorModule.useColorLibrary = originalColors; }
});

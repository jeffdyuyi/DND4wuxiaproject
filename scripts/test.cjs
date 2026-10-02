const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
// Compile TS in memory: never touch browser data or generated repository files.
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
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
const { ProgressionCard } = load('components/Progression.tsx');
function storage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

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

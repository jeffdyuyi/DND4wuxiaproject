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
    power.name = '外部修改';
    const signal = new AbortController().signal;
    const result = await loadTemplate('/', index.entries[1], index, signal);
    assert.equal(result.powers.get(power.id).name, '自定义测试招式');
    assert.throws(() => importTemplatePack({ ...pack, originals: [parent, parent] }), /重复/);
    assert.throws(() => importTemplatePack({ ...pack, originals: [{ ...parent, wiki: { transclusions: [123] } }] }), /引用/);
    assert.throws(() => importTemplatePack({ ...pack, version: 2 }), /版本/);
    assert.equal((await loadTemplateIndex('/', signal)).sourceVersion, 'test-private');
});

test('reference vocabulary has valid categories, preserved wuxia words and stable rule codes', () => {
    const terms = validateTerminology(defaultTerminology());
    assert(terms.entries.some(term => term.category === 'damage' && term.label === '火焰'));
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
    assert(html.includes('旧格挡')); assert(html.includes('旧出招')); assert(!html.includes('金钟罩'));
    assert.throws(() => validateTerminology({ ...local, entries: [...local.entries, local.entries[0]] }), /重复/);
});

test('renamed and hidden suggestions retain legacy selection and authored labels', () => {
    const terms = defaultTerminology();
    const defense = terms.entries.find(term => term.value === 'AC'); defense.label = '金钟罩';
    const render = props => renderToStaticMarkup(React.createElement(TerminologyContext.Provider,
        { value: { terminology: terms, update: () => {}, collect: () => {} } }, React.createElement(TermSelect, props)));
    const legacy = render({ label: '防御', category: 'defense', value: 'AC', onChange: () => {} });
    assert(legacy.includes('格挡（卡片原有名称）')); assert(legacy.includes('金钟罩'));
    defense.hidden = true;
    const snapshot = render({ label: '防御', category: 'defense', value: 'AC', snapshot: '旧名称', onChange: () => {} });
    assert(snapshot.includes('旧名称（卡片原有名称）')); assert(!snapshot.includes('金钟罩'));
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

test('navigation gives sibling panels distinct identities across populated and empty modules', () => {
    const libraryModule = load('hooks/useLibrary.ts');
    const originalLibrary = libraryModule.useLibrary;
    const originalState = React.useState;
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
        const find = (element, predicate) => {
            if (!React.isValidElement(element)) return undefined;
            if (predicate(element)) return element;
            for (const child of React.Children.toArray(element.props.children)) {
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
            assert.equal(panels.length, 3);
            assert.equal(new Set(panels.map(panel => panel.key)).size, 3, 'sibling keys must be unique');
            const editor = panels.find(panel => panel.type === Editor);
            const preview = panels.find(panel => panel.type === Preview);
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
        libraryModule.useLibrary = originalLibrary;
    }
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

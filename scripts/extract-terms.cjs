// Regenerate curated 4E suggestions without evaluating source code or copying rule prose.
// node scripts/extract-terms.cjs <4E-NEXT-main checkout>
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = process.argv[2];
if (!root) throw new Error('请提供 4E-NEXT-main 项目路径');
const filename = path.join(root, 'web/src/lib/homebrewSchema.ts');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
function literal(node) {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => [p.name.text, literal(p.initializer)]));
    throw new Error('非静态数据，拒绝提取');
}
function declaration(name) {
    for (const statement of source.statements) if (ts.isVariableStatement(statement)) {
        for (const d of statement.declarationList.declarations) if (d.name.text === name) return literal(d.initializer);
    }
    throw new Error(`找不到 ${name}`);
}
const categories = { '伤害类型': 'damage', '效果类型': 'effect', '附件类型': 'accessory', '力量来源': 'source', '其他': 'other' };
const entries = declaration('POWER_KEYWORD_GROUPS').flatMap(group => group.items.map(item => ({ category: categories[group.label], label: item.kw, reference: item.kw })));
for (const [group, words] of Object.entries(declaration('GROUPS_BY_CATEGORY'))) {
    const category = { 武器: 'weaponGroup', 法器: 'implement', 护甲: 'armor' }[group];
    entries.push(...words.map(label => ({ category, label, reference: label })));
}
const references = JSON.parse(fs.readFileSync(path.join(root, 'out/categories/reference.json'), 'utf8'));
const weapons = references.find(entry => entry.name === '武器');
if (!weapons) throw new Error('缺少武器参考条目');
for (const match of weapons.sourceText.matchAll(/<tr><td>([^<]+)<\/td><td>\+\d/g)) {
    const label = match[1].split(/\s/)[0].replace(/[（(]\d+[）)]$/, '');
    if (label && !entries.some(entry => entry.category === 'weapon' && entry.label === label)) entries.push({ category: 'weapon', label, reference: label, source: '4E-NEXT-main/reference · 武器表' });
}
const conditions = references.find(entry => entry.name === '状态表');
if (!conditions) throw new Error('缺少状态表参考条目');
for (const heading of conditions.wiki.headings) {
    const label = heading.split(/\s/)[0];
    entries.push({ category: 'status', label, reference: label, source: '4E-NEXT-main/reference · 状态表' });
}
const equipment = JSON.parse(fs.readFileSync(path.join(root, 'out/categories/equipment.json'), 'utf8'));
const slots = [...new Set(equipment.map(entry => entry.itemCategory || entry.fields?.['item-category']).filter(value => /部$|^戒指$/.test(value || '')))];
for (const label of slots) entries.push({ category: 'slot', label, reference: label, source: '4E-NEXT-main/equipment · itemCategory' });
fs.mkdirSync(path.join(__dirname, '../src/data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../src/data/4e-terms.json'), JSON.stringify({ source: '4E-NEXT-main/web/src/lib/homebrewSchema.ts · POWER_KEYWORD_GROUPS / GROUPS_BY_CATEGORY', entries }, null, 2) + '\n');
console.log(`已提取 ${entries.length} 个分类术语`);

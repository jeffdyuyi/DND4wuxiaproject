// node scripts/extract-templates.cjs <4E-NEXT-main checkout>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.argv[2];
if (!root) throw new Error('请提供 4E-NEXT-main 项目路径');
const categories = ['power', 'class', 'race', 'feat', 'equipment', 'paragon-path', 'epic-destiny'];
const output = path.join(__dirname, '../.local-templates');
fs.mkdirSync(output, { recursive: true });
const entries = [], originals = [], counts = {};
const dataset = crypto.createHash('sha256');
for (const category of categories) {
    const raw = fs.readFileSync(path.join(root, 'out/canonical', category + '.jsonl'), 'utf8');
    dataset.update(raw);
    const rows = raw.trim().split(/\r?\n/).map(JSON.parse);
    originals.push(...rows);
    counts[category] = rows.length;
    for (let offset = 0; offset < rows.length; offset += 100) {
        const chunk = rows.slice(offset, offset + 100);
        const json = JSON.stringify(chunk);
        const hash = crypto.createHash('sha256').update(json).digest('hex').slice(0, 12);
        const file = `${category}-${String(offset / 100).padStart(3, '0')}-${hash}.json`;
        fs.writeFileSync(path.join(output, file), json + '\n');
        for (const entry of chunk) {
            if (entry.category !== category || !entry.id || !entry.name) throw new Error('原版类别、ID 或名称缺失');
            entries.push({ id: entry.id, name: entry.name, nameEn: entry.nameEn || '', category, source: entry.source || entry.fields?.source || '', level: String(entry.level || entry.itemLevel || entry.fields?.level || ''), keywords: entry.keywords || entry.fields?.keywords || '', file });
        }
    }
}
const meta = JSON.parse(fs.readFileSync(path.join(root, 'out/canonical/_meta.json'), 'utf8'));
const index = { version: 1, dataset: dataset.digest('hex'), sourceVersion: `canonical-v${meta.schemaVersion} / ${meta.generatedAt}`, entries };
fs.writeFileSync(path.join(output, 'index.json'), JSON.stringify(index) + '\n');
fs.writeFileSync(path.join(output, '4e-next-pack.json'), JSON.stringify({ version: 1, sourceVersion: index.sourceVersion, originals }) + '\n');
console.log(JSON.stringify({ total: entries.length, counts, sourceVersion: index.sourceVersion }));

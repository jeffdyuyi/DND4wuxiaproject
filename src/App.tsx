import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ListPanel } from './components/ListPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { HomePage } from './components/HomePage';
import { DisclaimerModal } from './components/DisclaimerModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ImportDialog } from './components/ImportDialog';
import { Config, type ModuleType } from './constants';
import type { DB, Item } from './types';
import { useLibrary } from './hooks/useLibrary';
import { createResource, duplicateResource, withItems } from './utils/resources';
import { downloadJSON, makeArchive, mergeResources, readArchive, type ImportMode } from './utils/archive';

type Confirmation = { kind: 'delete'; module: ModuleType; id: string } | { kind: 'recovery' } | null;

function App() {
  const library = useLibrary();
  const { db } = library;
  const [viewMode, setViewMode] = useState<'home' | 'tool'>('home');
  const [module, setModule] = useState<ModuleType>('moves');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [incoming, setIncoming] = useState<Partial<DB> | null>(null);
  const [notice, setNotice] = useState('');
  const [recoveryExported, setRecoveryExported] = useState(false);

  const selectModule = (mod: ModuleType, id?: string) => {
    setModule(mod); setViewMode('tool'); setCurrentItemId(id ?? db[mod][0]?.id ?? null);
  };
  const createNew = () => {
    const item = createResource(module);
    library.update(withItems(db, module, [item, ...db[module]]));
    setCurrentItemId(item.id);
  };
  const updateItem = (item: Item) => library.update(withItems(db, module, db[module].map(current => current.id === item.id ? item : current)));
  const duplicateItem = (id: string) => {
    const original = db[module].find(item => item.id === id);
    if (!original) return;
    const copy = duplicateResource(original); copy.name = `${copy.name}（副本）`;
    library.update(withItems(db, module, [copy, ...db[module]])); setCurrentItemId(copy.id);
  };
  const confirm = () => {
    if (confirmation?.kind === 'delete') {
      const items = db[confirmation.module].filter(item => item.id !== confirmation.id);
      library.update(withItems(db, confirmation.module, items));
      if (module === confirmation.module && currentItemId === confirmation.id) setCurrentItemId(items[0]?.id ?? null);
    } else if (confirmation?.kind === 'recovery') library.allowSave();
    setConfirmation(null);
  };
  const handleImport = async (file: File) => {
    try { setIncoming(readArchive(JSON.parse(await file.text()))); setNotice(''); }
    catch (error) { setNotice(`导入未执行：${error instanceof Error ? error.message : '文件无法读取'}`); }
  };
  const applyImport = (mode: ImportMode) => {
    if (!incoming) return;
    const result = mergeResources(db, incoming, mode);
    library.update(result.db); setIncoming(null);
    setNotice(`导入已处理：新增 ${result.added}，覆盖 ${result.replaced}，跳过 ${result.skipped}。保存结果见上方状态。`);
  };
  const exportLibrary = () => downloadJSON(makeArchive(db), '吾侠_全库.json');
  const exportItems = (ids: string[]) => downloadJSON(makeArchive({ [module]: db[module].filter(item => ids.includes(item.id)) }), `吾侠_${Config[module].title}_资源.json`);
  const currentItem = db[module].find(item => item.id === currentItemId) ?? null;

  return <div className="app-container">
    {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
    {confirmation && <ConfirmModal
      message={confirmation.kind === 'delete' ? '确认删除此条目？删除后可以从之前导出的备份恢复。' : '恢复原文已导出。继续将用当前可用资源建立新的本地存档；请妥善保留恢复文件。'}
      confirmLabel={confirmation.kind === 'delete' ? '确认删除' : '继续保存'}
      onConfirm={confirm} onCancel={() => setConfirmation(null)} />}
    {incoming && <ImportDialog db={db} incoming={incoming} onConfirm={applyImport} onCancel={() => setIncoming(null)} />}
    <Sidebar currentModule={module} viewMode={viewMode} onSwitchModule={selectModule} onGoHome={() => setViewMode('home')} />
    <div className="workspace">
      <header className="workspace-toolbar">
        <strong>{viewMode === 'home' ? '吾侠 · 资源制作' : Config[module].title}</strong>
        <span role="status" className={library.blocked || library.dirty ? 'save-status save-warning' : 'save-status'}>
          {library.blocked ? '保存已暂停' : library.dirty ? '有未保存修改' : '本地数据就绪'}
        </span>
        <button type="button" className="btn" onClick={exportLibrary}>备份全库</button>
        <label className="btn import-button">导入 JSON<input aria-label="导入资源 JSON" type="file" accept=".json,application/json" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleImport(file);
        }} /></label>
        {library.dirty && !library.blocked && <button type="button" className="btn" onClick={library.retry}>重试保存</button>}
      </header>
      {library.blocked && <div className="feedback feedback-error" role="alert">
        {library.issues.join('；')}。原始数据未被覆盖。
        <button type="button" className="btn" onClick={() => { downloadJSON({ rawStorage: library.recovery, issues: library.issues }, '吾侠_存储恢复原文.json'); setRecoveryExported(true); }}>导出恢复原文</button>
        <button type="button" className="btn" disabled={!recoveryExported} onClick={() => setConfirmation({ kind: 'recovery' })}>使用当前数据继续</button>
      </div>}
      {library.error && <div className="feedback feedback-error" role="alert">{library.error}</div>}
      {notice && <div className="feedback" role="status">{notice}<button className="btn" onClick={() => setNotice('')}>关闭</button></div>}
      <main className="workspace-content">
        {viewMode === 'home' ? <HomePage db={db} onNavigate={selectModule} /> : <>
          <ListPanel key={module} items={db[module]} currentItemId={currentItemId} onSelect={setCurrentItemId}
            onCreate={createNew} onDelete={id => setConfirmation({ kind: 'delete', module, id })}
            onDuplicate={duplicateItem} onExportItems={exportItems} />
          <Editor key={currentItemId ?? 'empty'} module={module} item={currentItem} onChange={updateItem} />
          <Preview key={currentItemId ?? 'empty'} module={module} item={currentItem} />
        </>}
      </main>
    </div>
  </div>;
}
export default App;

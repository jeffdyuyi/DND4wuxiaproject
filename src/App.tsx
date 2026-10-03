import { lazy, Suspense, useEffect, useState } from 'react';
import type { TemplateDraft } from './utils/templates';
import { Sidebar } from './components/Sidebar';
import { ListPanel } from './components/ListPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { EditorWorkbench } from './components/EditorWorkbench';
import { HomePage } from './components/HomePage';
import { DisclaimerModal } from './components/DisclaimerModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ImportDialog } from './components/ImportDialog';
import { Dialog } from './components/Dialog';
import { SaveAsDialog } from './components/SaveAsDialog';
import { CardLibraryDialog } from './components/CardLibraryDialog';
import { readCardBytes, MAX_FILE_BYTES } from './utils/card-files';
import { TerminologyDialog } from './components/TerminologyDialog';
import { TerminologyContext } from './hooks/TerminologyContext';
import { mergeTerminology, type Terminology } from './utils/terminology';
import { Config, type ModuleType } from './constants';
import type { DB, Item } from './types';
import { useLibrary } from './hooks/useLibrary';
import { createResource, duplicateResource, withItems } from './utils/resources';
import { downloadJSON, makeArchive, mergeResources, type ImportMode } from './utils/archive';

type Confirmation = { kind: 'delete'; module: ModuleType; id: string } | { kind: 'recovery' } | null;
type Navigation = { kind: 'module'; module: ModuleType; id?: string } | { kind: 'home' } | { kind: 'create' } | { kind: 'templates' } | { kind: 'cards' };
const TemplatesDialog = lazy(() => import('./components/TemplatesDialog'));

function App() {
  const library = useLibrary();
  const { db } = library;
  const [viewMode, setViewMode] = useState<'home' | 'tool'>('home');
  const [module, setModule] = useState<ModuleType>('moves');
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [incoming, setIncoming] = useState<{ data: Partial<DB>; terminology?: Terminology } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [notice, setNotice] = useState('');
  const [recoveryExported, setRecoveryExported] = useState(false);
  const [draft, setDraft] = useState<{ module: ModuleType; item: Item } | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<Navigation | null>(null);
  const [saveAs, setSaveAs] = useState(false);
  const [packing, setPacking] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [homeSearch, setHomeSearch] = useState('');
  const workingDB = draft ? withItems(db, draft.module, db[draft.module].map(item => item.id === draft.item.id ? draft.item : item)) : db;
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);

  const performNavigation = (action: Navigation, data = db) => {
    if (action.kind === 'home') setViewMode('home');
    else if (action.kind === 'templates') setShowTemplates(true);
    else if (action.kind === 'cards') setShowCards(true);
    else if (action.kind === 'create') {
      const item = createResource(module); library.update(withItems(data, module, [item, ...data[module]])); setCurrentItemId(item.id);
    } else { setModule(action.module); setViewMode('tool'); setCurrentItemId(action.id ?? data[action.module][0]?.id ?? null); }
  };
  const navigate = (action: Navigation) => { if (draft) setPendingNavigation(action); else performNavigation(action); };
  const selectModule = (mod: ModuleType, id?: string) => navigate({ kind: 'module', module: mod, id });
  const createNew = () => navigate({ kind: 'create' });
  const updateItem = (item: Item) => setDraft(JSON.stringify(item) === JSON.stringify(db[module].find(original => original.id === item.id)) ? null : { module, item });
  const saveCard = (copy = false, name?: string): DB => {
    const original = draft?.item ?? db[module].find(item => item.id === currentItemId);
    if (!original) return db;
    const item = copy ? duplicateResource(original) : original;
    if (copy) item.name = name ?? `${original.name}（副本）`;
    const next = withItems(db, module, copy ? [item, ...db[module]] : db[module].map(current => current.id === item.id ? item : current));
    library.update(next); setDraft(null); setCurrentItemId(item.id);
    setNotice(copy ? '已保存为独立新卡，原卡保持不变。保存结果见上方状态。' : '当前卡片已提交保存，保存结果见上方状态。');
    return next;
  };
  const duplicateItem = (id: string) => {
    if (draft && draft.item.id !== id) { setNotice('请先保存或放弃当前卡片的修改，再复制其他卡片。'); return; }
    const original = draft?.item.id === id ? draft.item : db[module].find(item => item.id === id);
    if (!original) return;
    const copy = duplicateResource(original); copy.name = `${copy.name}（副本）`;
    library.update(withItems(db, module, [copy, ...db[module]])); setDraft(null); setCurrentItemId(copy.id);
  };
  const confirm = () => {
    if (confirmation?.kind === 'delete') {
      const items = db[confirmation.module].filter(item => item.id !== confirmation.id);
      library.update(withItems(db, confirmation.module, items));
      if (draft?.item.id === confirmation.id && draft.module === confirmation.module) setDraft(null);
      if (module === confirmation.module && currentItemId === confirmation.id) setCurrentItemId(items[0]?.id ?? null);
    } else if (confirmation?.kind === 'recovery') library.allowSave();
    setConfirmation(null);
  };
  const handleImport = async (file: File, target?: ModuleType) => {
    if (draft) { setNotice('请先保存、另存或放弃当前草稿，再导入卡片。'); return; }
    try { if (file.size > MAX_FILE_BYTES) throw new Error('文件超过 100 MB'); setIncoming(readCardBytes(new Uint8Array(await file.arrayBuffer()), file.name, target)); setNotice(''); }
    catch (error) { setNotice(`导入未执行：${error instanceof Error ? error.message : '文件无法读取'}`); }
  };
  const applyImport = (mode: ImportMode) => {
    if (!incoming) return;
    const result = mergeResources(db, incoming.data, mode);
    const terms = incoming.terminology ? mergeTerminology(library.terminology, incoming.terminology) : library.terminology;
    library.update(result.db, terms); setIncoming(null);
    const addedModule = Object.keys(incoming.data).find(key => incoming.data[key as ModuleType]?.length) as ModuleType | undefined;
    if (addedModule) { const known = new Set(db[addedModule].map(item => item.id)); const first = result.db[addedModule].find(item => !known.has(item.id)) ?? result.db[addedModule].find(item => incoming.data[addedModule]?.some(source => source.id === item.id)); setModule(addedModule); setCurrentItemId(first?.id ?? null); setViewMode('tool'); }
    setNotice(`导入已处理：新增 ${result.added}，覆盖 ${result.replaced}，跳过 ${result.skipped}。保存结果见上方状态。`);
  };
  const exportLibrary = () => downloadJSON(makeArchive(workingDB, library.terminology), '吾侠_全库.json');
  const exportItems = (ids: string[]) => downloadJSON(makeArchive({ [module]: workingDB[module].filter(item => ids.includes(item.id)) }), `吾侠_${Config[module].title}_资源.json`);
  const bundleEntries = async (entries: { module: ModuleType; item: Item }[], images: boolean) => {
    if (packing) return; setPacking(true);
    try { const { exportCardBundle } = await import('./components/card-export'); await exportCardBundle(entries, images, setNotice); setNotice('卡片 ZIP 已打包下载，可导回继续编辑。'); }
    catch (error) { setNotice(`打包失败：${error instanceof Error ? error.message : '请减少数量重试'}`); }
    finally { setPacking(false); }
  };
  const bundle = (ids: string[], images: boolean) => bundleEntries(workingDB[module].filter(item => ids.includes(item.id)).map(item => ({ module, item })), images);
  const currentItem = workingDB[module].find(item => item.id === currentItemId) ?? null;
  const copyTemplates = (drafts: TemplateDraft[]) => {
    if (!drafts.length) return;
    let next = db;
    for (const draft of drafts) next = withItems(next, draft.module, [draft.item, ...next[draft.module]]);
    library.update(next); setModule(drafts[0].module); setCurrentItemId(drafts[0].item.id); setViewMode('tool'); setShowTemplates(false);
    setNotice(`已复制 ${drafts.length} 条 4E 草稿。原版保持只读；请查看编辑器中的“4E 原版对照”和转换提示。`);
  };

  return <TerminologyContext.Provider value={{ terminology: library.terminology, update: library.updateTerminology, collect: library.collect }}><div className="app-container" onKeyDownCapture={event => {
    if (viewMode === 'tool' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (currentItemId && !library.blocked && !pendingNavigation && !saveAs && !showTerms && !showTemplates && !showCards && !showDisclaimer && !confirmation && !incoming) saveCard();
    }
  }}>
    {showCards && <CardLibraryDialog db={workingDB} busy={packing} status={notice} onBundle={(entries, images) => void bundleEntries(entries, images)} onClose={() => setShowCards(false)} />}
    {saveAs && currentItem && <SaveAsDialog name={currentItem.name} onClose={() => setSaveAs(false)} onSave={name => { saveCard(true, name); setSaveAs(false); }} />}
    {pendingNavigation && <Dialog title="当前卡片尚未保存" onCancel={() => setPendingNavigation(null)}><p>请选择如何处理修改，再离开当前卡片。</p><div className="dialog-actions"><button className="btn" onClick={() => setPendingNavigation(null)}>继续编辑</button><button className="btn" onClick={() => { const action = pendingNavigation; setDraft(null); setPendingNavigation(null); performNavigation(action); }}>放弃修改</button><button className="btn" onClick={() => { const next = saveCard(true); const action = pendingNavigation; setPendingNavigation(null); performNavigation(action, next); }}>复制保存</button><button className="btn btn-primary" onClick={() => { const next = saveCard(); const action = pendingNavigation; setPendingNavigation(null); performNavigation(action, next); }}>覆盖保存</button></div></Dialog>}
    {showTemplates && <Suspense fallback={<div className="feedback" role="status">正在打开资源管理…</div>}><TemplatesDialog currentModule={module} authorBytes={new TextEncoder().encode(JSON.stringify({ db, terminology: library.terminology })).byteLength} onCopy={copyTemplates} onClose={() => setShowTemplates(false)} /></Suspense>}
    {showTerms && <TerminologyDialog onClose={() => setShowTerms(false)} />}
    {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
    {confirmation && <ConfirmModal
      message={confirmation.kind === 'delete' ? '确认删除此条目？删除后可以从之前导出的备份恢复。' : '恢复原文已导出。继续将用当前可用资源建立新的本地存档；请妥善保留恢复文件。'}
      confirmLabel={confirmation.kind === 'delete' ? '确认删除' : '继续保存'}
      onConfirm={confirm} onCancel={() => setConfirmation(null)} />}
    {incoming && <ImportDialog db={db} incoming={incoming.data} terminology={incoming.terminology} onConfirm={applyImport} onCancel={() => setIncoming(null)} />}
    <Sidebar currentModule={module} viewMode={viewMode} onSwitchModule={selectModule} onGoHome={() => navigate({ kind: 'home' })} />
    <div className="workspace">
      <header className="workspace-toolbar">
        <div className="workspace-brand">
          <button type="button" className="brand-button" aria-label="吾侠：查看作者信息" aria-haspopup="dialog" onClick={() => setShowDisclaimer(true)}>吾侠</button>
          {viewMode !== 'home' && <span className="workspace-module">{Config[module].title}</span>}
        </div>
        <span role="status" className={library.blocked || library.dirty || draft ? 'save-status save-warning' : 'save-status'}>
          {library.blocked ? '保存已暂停' : library.error ? '保存失败，请重试' : draft ? '草稿未保存' : library.dirty ? '等待保存' : library.savedAt ? '已保存到本地 · ' + new Date(library.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '本地数据就绪'}
        </span>
        <button type="button" className="btn" onClick={exportLibrary}>备份全库</button>
        <button type="button" className="btn" onClick={() => navigate({ kind: 'cards' })}>卡牌库</button>
        <button type="button" className="btn" onClick={() => setShowTerms(true)}>术语库</button>
        <button type="button" className="btn" onClick={() => navigate({ kind: 'templates' })}>资源管理</button>
        <label className="btn import-button">导入全库／卡片<input aria-label="导入资源 JSON、PNG 或 ZIP" type="file" accept=".json,.png,.zip" onChange={event => {
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
      {viewMode === 'tool' && <div className="card-tools"><button className="btn btn-primary" disabled={!currentItem || library.blocked} onClick={() => saveCard()}>覆盖保存</button><button className="btn" disabled={!currentItem || library.blocked} onClick={() => saveCard(true)}>复制保存</button><button className="btn" disabled={!currentItem || library.blocked} onClick={() => setSaveAs(true)}>不覆盖另存</button><button className="btn" disabled={!draft} onClick={() => setDraft(null)}>放弃修改</button><label className="btn import-button">导入卡片<input aria-label="当前工具导入 JSON、PNG 或 ZIP" type="file" accept=".json,.png,.zip" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleImport(file, module); }} /></label><label className="btn import-button">导入 4E 模板<input aria-label="当前工具直接导入 4E 模板 JSON" type="file" accept=".json" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void handleImport(file, module); }} /></label><small>修改先保留为草稿；选择保存后写入本地。</small></div>}
      <main className="workspace-content">
        {viewMode === 'home' ? <HomePage db={db} onNavigate={selectModule} searchTerm={homeSearch} onSearch={setHomeSearch} /> : <>
          <ListPanel key={`list:${module}`} items={workingDB[module]} currentItemId={currentItemId} onSelect={id => selectModule(module, id)}
            onCreate={createNew} onDelete={id => setConfirmation({ kind: 'delete', module, id })}
            onDuplicate={duplicateItem} onExportItems={exportItems} onBundle={(ids, images) => void bundle(ids, images)} busy={packing} />
          <EditorWorkbench key={`workbench:${module}:${currentItemId ?? 'empty'}`} resourceId={`${module}:${currentItemId ?? 'empty'}`}
            editor={<Editor module={module} item={currentItem} onChange={updateItem} />}
            preview={<Preview module={module} item={currentItem} />} />
        </>}
      </main>
    </div>
  </div></TerminologyContext.Provider>;
}
export default App;

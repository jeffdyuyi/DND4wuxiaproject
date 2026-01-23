
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ListPanel } from './components/ListPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { HomePage } from './components/HomePage';
import type { ModuleType } from './constants';
import { Config } from './constants';
import type { Item, DB } from './types';
import { getStorage, setStorage } from './utils/storage';

const INITIAL_DB: DB = {
  moves: [],
  roots: [],
  destinies: [],
  origins: [],
  feats: [],
  items: []
};

type ViewMode = 'home' | 'tool';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [module, setModule] = useState<ModuleType>('moves');
  const [db, setDb] = useState<DB>(INITIAL_DB);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  // Initialize from storage on mount
  useEffect(() => {
    const newDb: DB = { ...INITIAL_DB };
    for (const key of Object.keys(Config) as ModuleType[]) {
      newDb[key] = getStorage(Config[key].key);
    }
    setDb(newDb);
    // Do not auto-select item or module, stay on home by default unless logic changes
  }, []);

  const saveDb = (newDb: DB, mod: ModuleType) => {
    setDb(newDb);
    setStorage(Config[mod].key, newDb[mod]);
  };

  const createNew = (mod: ModuleType = module, currentDb: DB = db) => {
    const id = Date.now().toString();
    let newItem: any = { id, name: "新条目" };

    // Defaults
    if (mod === 'moves') newItem = { ...newItem, type: 'basic', level: 1, cls: '门派', flavor: '描述...', action: 'std', range: '近战 兵器', keywords: '外功, 兵器', target: '一个生物', att: '力量', def: '格挡', hit: '1[W] + 力量调整值 伤害' };
    else if (mod === 'items') newItem = { ...newItem, level: 1, type: '兵器', price: '360两', slot: '主手', flavor: '描述...', enhance: '+1', crit: '+1d6', prop: '', power: '' };
    else newItem = { ...newItem, tier: '英雄层级', flavor: '描述...', benefit: '效果...' };

    const newModList = [newItem, ...currentDb[mod]];
    const newDb = { ...currentDb, [mod]: newModList };
    saveDb(newDb, mod);
    setCurrentItemId(id);
    // Also switch to tool view if creating from somewhere else?
    if (viewMode === 'home') {
      setViewMode('tool');
      setModule(mod);
    }
  };

  const deleteItem = (id: string) => {
    if (!confirm("确认删除？")) return;
    const newModList = db[module].filter(i => i.id !== id);
    const newDb = { ...db, [module]: newModList };
    saveDb(newDb, module);
    if (newModList.length > 0) setCurrentItemId(newModList[0].id);
    else createNew(module, newDb);
  };

  const updateItem = (item: Item) => {
    const newModList = db[module].map(i => i.id === item.id ? item : i);
    const newDb = { ...db, [module]: newModList };
    saveDb(newDb, module);
  };

  const switchModule = (newMod: ModuleType) => {
    setModule(newMod);
    setViewMode('tool');
    if (db[newMod].length === 0) createNew(newMod);
    else setCurrentItemId(db[newMod][0].id);
  };

  const goHome = () => {
    setViewMode('home');
  };

  const navigateFromHome = (mod: ModuleType, itemId?: string) => {
    setModule(mod);
    setViewMode('tool');
    if (itemId) {
      setCurrentItemId(itemId);
    } else {
      if (db[mod].length === 0) createNew(mod);
      else setCurrentItemId(db[mod][0].id);
    }
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const newDb = { ...db };
        for (let k in data) {
          if (k in newDb) {
            // Concat and update storage
            // @ts-ignore
            newDb[k as ModuleType] = [...newDb[k as ModuleType], ...data[k]];
            setStorage(Config[k as ModuleType].key, newDb[k as ModuleType]);
          }
        }
        setDb(newDb);
        alert("导入成功！");
      } catch (err) {
        alert("文件错误");
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "中武江湖_全库.json";
    a.click();
  };

  const currentItem = db[module].find(i => i.id === currentItemId) || null;

  return (
    <div className="app-container">
      <Sidebar
        currentModule={module}
        viewMode={viewMode}
        onSwitchModule={switchModule}
        onGoHome={goHome}
      />

      {viewMode === 'home' ? (
        <HomePage db={db} onNavigate={navigateFromHome} />
      ) : (
        <>
          <ListPanel
            items={db[module]}
            currentItemId={currentItemId}
            onSelect={setCurrentItemId}
            onCreate={() => createNew()}
            onDelete={deleteItem}
            onExport={handleExport}
            onImport={handleImport}
          />
          <Editor
            module={module}
            item={currentItem}
            onChange={updateItem}
          />
          <Preview module={module} item={currentItem} />
        </>
      )}
    </div>
  );
}

export default App;

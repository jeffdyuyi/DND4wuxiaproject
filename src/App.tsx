
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ListPanel } from './components/ListPanel';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { HomePage } from './components/HomePage';
import { DisclaimerModal } from './components/DisclaimerModal';
import { ConfirmModal } from './components/ConfirmModal';
import type { ModuleType } from './constants';
import { Config } from './constants';
import type { Item, DB } from './types';
import { getStorage, setStorage } from './utils/storage';

const INITIAL_DB: DB = {
  schools: [],
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
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [confirmState, setConfirmState] = useState<{ show: boolean; itemId: string | null }>({
    show: false,
    itemId: null,
  });

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
    else if (mod === 'schools') newItem = { ...newItem, description: '门派描述...', armorProf: '布甲', weaponProf: '简易近战', defBonus: '+1 强韧', hpStart: '12 + 体质值', hpPerLvl: '5', surges: '7 + 体质调整值', trainedSkills: '从列表中选择...', features: [] };
    else if (mod === 'roots') newItem = { ...newItem, attributes: '+2 力量, +2 敏捷', size: '中型', speed: '6格', vision: '普通', flavor: '描述...' };
    else if (mod === 'origins') newItem = { ...newItem, languages: '通用语', skillBonuses: '+2 运动', traits: [], flavor: '描述...' };
    else if (mod === 'destinies') newItem = { ...newItem, powerType: '遭遇', action: '次要动作', range: '近距 爆发 1', effect: '效果...', flavor: '描述...' };
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
    setConfirmState({ show: true, itemId: id });
  };

  const confirmDelete = () => {
    const id = confirmState.itemId;
    if (!id) return;
    setConfirmState({ show: false, itemId: null });
    const newModList = db[module].filter(i => i.id !== id);
    const newDb = { ...db, [module]: newModList };
    saveDb(newDb, module);
    if (newModList.length > 0) setCurrentItemId(newModList[0].id);
    else createNew(module, newDb);
  };

  const cancelDelete = () => {
    setConfirmState({ show: false, itemId: null });
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
        for (const k in data) {
          const mod = k as ModuleType;
          if (mod in newDb && Array.isArray(data[k])) {
            newDb[mod] = [...newDb[mod], ...(data[k] as Item[])];
            setStorage(Config[mod].key, newDb[mod]);
          }
        }
        setDb(newDb);
        alert("导入成功！");
      } catch (err) {
        alert("文件格式错误，请确认为有效的 JSON 导出文件。");
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
      {showDisclaimer && <DisclaimerModal onClose={() => setShowDisclaimer(false)} />}
      {confirmState.show && (
        <ConfirmModal
          message="确认删除此条目？此操作无法撤销。"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
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

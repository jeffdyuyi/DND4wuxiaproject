import { useMemo, useState } from 'react';
import type { DB } from '../types';
import type { ModuleType } from '../constants';
import { Config, ICONS } from '../constants';
import { modules, searchResources } from '../utils/resources';

interface HomePageProps {
    db: DB;
    onNavigate: (module: ModuleType, itemId?: string) => void;
}

export function HomePage({ db, onNavigate }: HomePageProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const query = searchTerm.trim();
    const results = useMemo(() => searchResources(db, query), [db, query]);

    return <div className="home-page">
        <h1>吾侠</h1>
        <div className="module-grid">
            {modules.map(module => <button type="button" className="module-tile" key={module} onClick={() => onNavigate(module)}>
                <span className="module-icon" aria-hidden="true">{ICONS[module]}</span>
                <span><strong>{Config[module].title}</strong><small>{db[module].length} 个条目</small></span>
            </button>)}
        </div>
        <section className="library-search" aria-labelledby="library-search-title">
            <h2 id="library-search-title">🔍 藏经阁总索引</h2>
            <input className="form-control" aria-label="搜索所有资源库" type="search" placeholder="输入关键词搜索所有库…"
                value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
            {query && <div className="search-results">
                <p className="search-count" role="status">找到 {results.length} 个条目</p>
                {results.length === 0 ? <p className="empty-state">未找到相关条目</p> : results.map(({ module, item }) =>
                    <button type="button" className="search-result" key={module + '-' + item.id} onClick={() => onNavigate(module, item.id)}>
                        <span><strong>{item.name || '未命名资源'}</strong><span className="module-tag">{Config[module].title}</span></span>
                        <span aria-hidden="true">{ICONS[module]}</span>
                    </button>)}
            </div>}
        </section>
    </div>;
}

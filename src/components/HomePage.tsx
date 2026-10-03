import { useTerminology } from '../hooks/TerminologyContext';
import { createTermTranslator } from '../utils/term-display';
import { TermDisplay } from './TermDisplay';
import { useMemo, useState } from 'react';
import type { DB } from '../types';
import type { ModuleType } from '../constants';
import { Config, ICONS } from '../constants';
import { modules, searchResources } from '../utils/resources';

interface HomePageProps {
    db: DB;
    onNavigate: (module: ModuleType, itemId?: string) => void;
    searchTerm: string;
    onSearch: (value: string) => void;
}

export function HomePage({ db, onNavigate, searchTerm, onSearch }: HomePageProps) {
    const { terminology } = useTerminology();
    const display = createTermTranslator(terminology);
    const [category, setCategory] = useState<ModuleType | 'all'>('all');
    const query = searchTerm.trim();
    const results = useMemo(() => searchResources(db, query, display).filter(result => category === 'all' || result.module === category), [db, query, category, display]);

    return <div className="home-page">
        <section className="library-search" aria-labelledby="library-search-title">
            <h2 id="library-search-title"><TermDisplay>{"🔍 藏经阁总索引"}</TermDisplay></h2>
            <input className="form-control" aria-label="搜索所有资源" type="search" placeholder="输入关键词搜索所有资源…"
                value={searchTerm} onChange={event => onSearch(event.target.value)} />
            <div className="home-filters"><label><TermDisplay>{"资源类型 "}</TermDisplay><select aria-label="筛选搜索资源类型" value={category} onChange={event => setCategory(event.target.value as ModuleType | 'all')}><option value="all"><TermDisplay>{"所有资源"}</TermDisplay></option>{modules.map(module => <option key={module} value={module}>{<TermDisplay>{Config[module].title}</TermDisplay>}</option>)}</select></label>{(query || category !== 'all') && <button className="btn" onClick={() => { onSearch(''); setCategory('all'); }}><TermDisplay>{"清除筛选"}</TermDisplay></button>}</div>
            {query && <div className="search-results">
                <p className="search-count" role="status"><TermDisplay>{"找到 "}</TermDisplay>{<TermDisplay>{results.length}</TermDisplay>}<TermDisplay>{" 个条目"}</TermDisplay></p>
                {results.length === 0 ? <p className="empty-state"><TermDisplay>{"未找到相关条目"}</TermDisplay></p> : results.map(({ module, item }) =>
                    <button type="button" className="search-result" key={module + '-' + item.id} onClick={() => onNavigate(module, item.id)}>
                        <span><strong>{<TermDisplay>{item.name || '未命名资源'}</TermDisplay>}</strong><span className="module-tag">{<TermDisplay>{Config[module].title}</TermDisplay>}</span></span>
                        <span aria-hidden="true">{<TermDisplay>{ICONS[module]}</TermDisplay>}</span>
                    </button>)}
            </div>}
        </section>
        <div className="module-grid">
            {modules.map(module => <button type="button" className="module-tile" key={module} onClick={() => onNavigate(module)}>
                <span className="module-icon" aria-hidden="true">{<TermDisplay>{ICONS[module]}</TermDisplay>}</span>
                <span><strong>{<TermDisplay>{Config[module].title}</TermDisplay>}</strong><small>{<TermDisplay>{db[module].length}</TermDisplay>}<TermDisplay>{" 个条目"}</TermDisplay></small></span>
            </button>)}
        </div>
    </div>;
}

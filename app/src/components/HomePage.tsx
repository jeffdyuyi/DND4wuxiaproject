
import React, { useState } from 'react';
import type { DB, Item } from '../types';
import type { ModuleType } from '../constants';
import { Config, ICONS } from '../constants';

interface HomePageProps {
    db: DB;
    onNavigate: (module: ModuleType, itemId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ db, onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Global Search Logic
    const searchResults = React.useMemo(() => {
        if (!searchTerm) return [];
        const results: { module: ModuleType; item: Item }[] = [];
        (Object.keys(Config) as ModuleType[]).forEach(mod => {
            db[mod].forEach(item => {
                if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                    results.push({ module: mod, item });
                }
            });
        });
        return results;
    }, [searchTerm, db]);

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px', color: '#2c3e50' }}>中武江湖·万象图谱 (宗师版)</h1>

            {/* Dashbaord Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '50px' }}>
                {(Object.keys(Config) as ModuleType[]).map(mod => (
                    <div
                        key={mod}
                        onClick={() => onNavigate(mod)}
                        style={{
                            backgroundColor: '#fff',
                            padding: '25px',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: '1px solid #eef1f5'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                        }}
                    >
                        <div style={{ fontSize: '40px', marginRight: '20px' }}>{ICONS[mod]}</div>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#2c3e50' }}>{Config[mod].title}</h3>
                            <span style={{ color: '#7f8c8d', fontSize: '14px' }}>{db[mod].length} 个条目</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Global Search Section */}
            <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', color: '#34495e' }}>🔍 藏经阁总索引 (Shared Library)</h2>
                <input
                    type="text"
                    placeholder="输入关键词搜索所有库..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        fontSize: '16px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#c0392b'}
                    onBlur={e => e.target.style.borderColor = '#e0e0e0'}
                />

                {searchTerm && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', borderTop: '1px solid #eee' }}>
                        {searchResults.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#95a5a6' }}>未找到相关条目</div>
                        ) : (
                            searchResults.map((res, idx) => (
                                <div
                                    key={`${res.module}-${res.item.id}-${idx}`}
                                    onClick={() => onNavigate(res.module, res.item.id)}
                                    style={{
                                        padding: '12px',
                                        borderBottom: '1px solid #f5f5f5',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <div>
                                        <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{res.item.name}</span>
                                        <span style={{ fontSize: '12px', color: '#7f8c8d', backgroundColor: '#ecf0f1', padding: '2px 6px', borderRadius: '4px' }}>
                                            {Config[res.module].title}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '20px' }}>{ICONS[res.module]}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

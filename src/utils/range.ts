export interface RangeParts { type: string; shape: string; distance: string; reach: string; }
export function parseRange(value: string): RangeParts {
    const parts = { type: 'Melee', shape: 'Burst', distance: '', reach: '10' };
    const simple = value.match(/^(近战|远程)\s*(.*)$/);
    if (simple) return { ...parts, type: simple[1] === '近战' ? 'Melee' : 'Ranged', distance: simple[2] };
    const area = value.match(/^(近距|近程|区域)\s*(爆发|冲击|气墙|墙)(?:\([^)]*\))?\s*(.*?)(?:\s*[（(](\d+)格内[）)])?$/);
    if (area) return { ...parts, type: area[1] === '区域' ? 'Area' : 'Close', shape: area[2] === '爆发' ? 'Burst' : area[2] === '冲击' ? 'Blast' : 'Wall', distance: area[3], reach: area[4] ?? '10' };
    return parts;
}
export function buildRange(parts: RangeParts): string {
    if (parts.type === 'Melee' || parts.type === 'Ranged') return `${parts.type === 'Melee' ? '近战' : '远程'} ${parts.distance}`;
    const shape = parts.shape === 'Burst' ? '爆发' : parts.shape === 'Blast' ? '冲击' : '气墙';
    return `${parts.type === 'Area' ? '区域' : '近距'}${shape} ${parts.distance}${parts.type === 'Area' ? `（${parts.reach}格内）` : ''}`;
}

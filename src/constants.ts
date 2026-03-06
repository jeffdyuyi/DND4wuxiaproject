
export const Config = {
    schools: { title: "武林门派库", color: "bg-red", key: "db_schools_v1" },
    moves: { title: "武学招式库", color: "bg-green", key: "db_moves_v5" },
    roots: { title: "根骨天赋库", color: "bg-gray", key: "db_roots_v5" },
    destinies: { title: "先天命格库", color: "bg-gray", key: "db_destinies_v5" },
    origins: { title: "江湖出身库", color: "bg-gray", key: "db_origins_v5" },
    feats: { title: "武道造诣库", color: "bg-gray", key: "db_feats_v5" },
    items: { title: "神兵宝甲库", color: "bg-gold", key: "db_items_v5" }
} as const;

export type ModuleType = keyof typeof Config;

export const Keywords = {
    source: ["外功", "内功", "外家", "内家", "先天", "奇门", "医道"],
    damage: ["罡劲", "纯阳", "纯阴", "震煞", "丹毒", "浩然", "阴煞", "胆魄", "音波"],
    effect: ["架势", "迷魂", "威慑", "幻术", "易容", "疗伤", "移形", "阵法", "无遗", "点穴"],
    accessory: ["兵器", "法器", "信物", "指法", "剑气"]
};

export const ICONS: Record<ModuleType, string> = {
    schools: '🏯',
    moves: '⚔️',
    roots: '🧬',
    destinies: '🔮',
    origins: '🏘️',
    feats: '🧘',
    items: '🗡️'
};

export const ActionMap = {
    'std': { t: '出招', c: 'act-std' },
    'mov': { t: '身法', c: 'act-mov' },
    'min': { t: '瞬息', c: 'act-min' },
    'free': { t: '随心', c: 'act-free' },
    'react': { t: '变招', c: 'act-react' }
} as const;

export const RangeTypes = {
    'Melee': '近战',
    'Ranged': '远程',
    'Close': '近距(以身为圆)',
    'Area': '区域(投掷)'
};

export const Shapes = {
    'Burst': '爆发(圆形)',
    'Blast': '冲击(扇形)',
    'Wall': '气墙'
};

export const Stats = ['力量', '体质', '敏捷', '智力', '感知', '魅力'];
export const Defenses = { 'AC': '格挡', 'Reflex': '身法', 'Fortitude': '护体', 'Will': '定力' };

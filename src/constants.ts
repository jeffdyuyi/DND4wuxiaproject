
export const Config = {
    schools: { title: "武林门派", color: "bg-red", key: "db_schools_v1" },
    moves: { title: "武学招式", color: "bg-green", key: "db_moves_v5" },
    roots: { title: "根骨天赋", color: "bg-gray", key: "db_roots_v5" },
    destinies: { title: "先天命格", color: "bg-gray", key: "db_destinies_v5" },
    origins: { title: "江湖出身", color: "bg-gray", key: "db_origins_v5" },
    feats: { title: "武道造诣", color: "bg-gray", key: "db_feats_v5" },
    items: { title: "神兵宝甲", color: "bg-gold", key: "db_items_v5" },
    traditions: { title: "修行传承", color: "bg-green", key: "db_traditions_v1" },
    paths: { title: "成道之途", color: "bg-gold", key: "db_paths_v1" }
} as const;

export type ModuleType = keyof typeof Config;

export const Keywords = {
    source: ["外功", "内功", "外家", "内家", "先天", "奇门", "医道"],
    damage: ["罡劲", "纯阳", "纯阴", "震煞", "丹毒", "浩然", "阴煞", "胆魄", "音波", "腐蚀"],
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
    items: '🗡️',
    traditions: '📜',
    paths: '☯️'
};

export const ActionMap = {
    'std': { t: '出招', c: 'act-std' },
    'mov': { t: '移动', c: 'act-mov' },
    'min': { t: '瞬息', c: 'act-min' },
    'free': { t: '随心', c: 'act-free' },
    'react': { t: '变招（旧版）', c: 'act-react' },
    'interrupt': { t: '即时打断', c: 'act-react' },
    'reaction': { t: '即时反应', c: 'act-react' },
    'opportunity': { t: '借机动作', c: 'act-react' },
    'none': { t: '无动作', c: 'act-free' }
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

export const UsageOptions = [
    { v: 'basic', t: '随意' }, { v: 'special', t: '遭遇' }, { v: 'ultimate', t: '每日' }
] as const;
export const ActionOptions = Object.entries(ActionMap).map(([v, item]) => ({ v, t: item.t }));

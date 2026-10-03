


export interface BaseItem {
    id: string;
    name: string;
    headerColor?: string;
    flavor?: string;
    source?: string;
    sourceText?: string;
    actionLabel?: string;
    defLabel?: string;
    typeLabel?: string;
    // Preserve extension fields from third-party resources without bypassing type checks.
    [key: string]: unknown;
}

export interface MoveItem extends BaseItem {
    type: 'basic' | 'special' | 'ultimate';
    level: number;
    cls: string;
    action: string; // key of ActionMap
    range: string;
    keywords: string;
    trigger?: string;
    target?: string;
    att?: string;
    def?: string;
    hit?: string;
    miss?: string;
    effect?: string;
    sustain?: string;
    special?: string;
    acquiredLevel?: string;
    rules?: RuleSection[];
}

export interface RuleSection { id: string; title: string; text: string; }
export interface Trait { id: string; name: string; desc: string; }

export interface EquipmentItem extends BaseItem {
    level: number;
    type: string;
    price: string;
    slot: string;
    enhance: string;
    crit: string;
    prop: string;
    power: string;
}

export interface GeneralItem extends BaseItem {
    tier?: string;
    stats?: string;
    traits?: string;
    powerName?: string;
    powerDesc?: string;
    skills?: string;
    benefit?: string;
    req?: string;
}




export interface SchoolItem extends BaseItem {
    description: string; // Replaces Role, Power Source, Key Abilities
    armorProf: string;
    weaponProf: string;
    defBonus: string;
    hpStart: string;
    hpPerLvl: string;
    surges: string;
    trainedSkills: string; // Text description of skill choices
    features: Trait[];
}

export interface RootItem extends BaseItem {
    attributes: string; // +2 Str, etc
    size: string;
    speed: string;
    vision: string;
    // other stats if needed
}

export interface OriginItem extends BaseItem {
    languages: string;
    skillBonuses: string;
    traits: Trait[];
}

export interface DestinyItem extends BaseItem {
    // Replaces Racial Power
    powerType: string; // Encounter, etc
    action: string;
    range: string;
    target?: string;
    effect: string;
}

export interface ProgressionFeature {
    id: string;
    level: string;
    name: string;
    desc: string;
}

/** Independent resource package; powers are embedded so JSON exports are self-contained. */
export interface ProgressionItem extends BaseItem {
    entryLevel: string;
    req: string;
    description: string;
    source: string;
    features: ProgressionFeature[];
    powers: MoveItem[];
    culminationTitle?: string;
    culmination?: string;
}

export type Item = MoveItem | EquipmentItem | GeneralItem | SchoolItem | RootItem | OriginItem | DestinyItem | ProgressionItem;

export interface ResourceMap {
    schools: SchoolItem;
    moves: MoveItem;
    roots: RootItem;
    destinies: DestinyItem;
    origins: OriginItem;
    feats: GeneralItem;
    items: EquipmentItem;
    traditions: ProgressionItem;
    paths: ProgressionItem;
}
export type DB = { [K in keyof ResourceMap]: ResourceMap[K][] };

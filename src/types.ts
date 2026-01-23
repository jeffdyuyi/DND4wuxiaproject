


export interface BaseItem {
    id: string;
    name: string;
    flavor?: string;
    // Generic fields that might exist on any item
    [key: string]: any;
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
}

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
    features: { name: string; desc: string }[]; // List of class features
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
    traits: { name: string; desc: string }[]; // Racial features like Dragonborn Fury
}

export interface DestinyItem extends BaseItem {
    // Replaces Racial Power
    powerType: string; // Encounter, etc
    action: string;
    range: string;
    target?: string;
    effect: string;
}

export type Item = MoveItem | EquipmentItem | GeneralItem | SchoolItem | RootItem | OriginItem | DestinyItem;

export interface DB {
    schools: Item[];
    moves: Item[];
    roots: Item[];
    destinies: Item[];
    origins: Item[];
    feats: Item[];
    items: Item[];
}

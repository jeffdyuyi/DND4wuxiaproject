


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

export type Item = MoveItem | EquipmentItem | GeneralItem;

export interface DB {
    moves: Item[];
    roots: Item[];
    destinies: Item[];
    origins: Item[];
    feats: Item[];
    items: Item[];
}

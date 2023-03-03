
export default GConfig;
export interface GConfig {
    meta: Meta;
    options?: Options;
    player?: Player;
    enemies: Enemies;

    components?: Components;
}

export interface Meta {
    name: string;
    description?: string;
    rawUrl: string;
    id: string;
    createdAt: number;
    lastSavedAt: number;
}

export interface Options {
    endPrompt?: {
        title: string;
        body: string;
        footer?: string;
    }
}
export interface Player {
    modList: Mod[];
}
export interface Enemies {
    enemyList: number[];
}
export interface Skills {
    attackSkills: {
        skillList: {
            name: string;
            attackSpeed: number;
            manaCost: number;
            baseDamageMultiplier: number;
            levelReq: number;
            mods?: Mod[];
        }[]
    };
    buffSkills?: {
        skillSlots: {
            levelReq: number;
        }[];
        skillList: {
            name: string;
            baseDuration: number;
            manaCost: number;
            levelReq: number;
            mods?: Mod[];
        }[];
    }
}

export interface Components {
    skills?: Skills;
    passives?: Passives;
    items?: Items;
    missions?: Missions;
    achievements?: Achievements;
}

export interface Passives {
    pointsPerLevel: number;
    passiveLists: {
        levelReq: number;
        points: number;
        mod: Mod;
    }[][];
}
export interface ItemMod {
    levelReq: number;
    weight: number;
    mod: Mod;
}
export interface Items {
    levelReq: number;
    itemList: {
        name: string;
        levelReq: number;
    }[];
    modLists: ItemMod[][];
    craftList: {
        id: CraftId;
        levelReq: number;
        cost: number;
    }[];
}
export interface Missions {
    levelReq: number;
    slots: {
        levelReq: number;
        cost: number;
    }[];
    missionLists: {
        description: string;
        levelReq: number;
        goldAmount: number;
    }[][];
}
export interface Achievements {
    list: {
        description: string;
        modList?: Mod[];
    }[]
}

export type Mod = string;


export type Components = GConfig['components'];
export type ComponentName = { [K in keyof Required<Required<GConfig>['components']>]: K }[keyof Required<GConfig>['components']];
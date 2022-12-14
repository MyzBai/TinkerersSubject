
export default GConfig;
export interface GConfig {
    options?: Options;
    player?: Player;
    enemies: Enemies;
    skills: Skills;
    items?: Items;
    achievements?: Achievements;
    prestige?: Prestige;
}

export interface Options {

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
    buffSkills: {
        skillSlots?: {
            levelReq: number;
        }[]
        skillList: {
            name: string;
            baseDuration: number;
            manaCost: number;
            levelReq: number;
            mods?: Mod[];
        }[]
    }
}
export interface ItemMod {
    levelReq: number;
    weight: number;
    mod: Mod;
}
export interface Items {
    unlockWhen?: UnlockWhen;
    itemList: {
        name: string;
        levelReq: number;
    }[];
    modTables: {
        general: ItemMod[][],
        special?: ItemMod[][]
    };
    craftList: {
        id: CraftId;
        levelReq: number;
        cost: number;
    }[];
}
export interface Achievements {
    unlockWhen?: UnlockWhen;
    list: {
        description: string;
        modList?: Mod[];
    }[]
}
export interface Prestige {
    goldMultiplier: number;
    maxGoldMultiplier: number;
}

export interface UnlockWhen {
    level?: number;
}

export type Mod = string;

export type CraftId =
    'reforge' | 'reforgeIncludePhysical' | 'reforgeIncludeMana' | 'reforgeIncludeCritical' | 'reforgeHigherChanceSameMods' | 'reforgeLowerChanceSameMods' |
    'addRandom' | 'addPhysical' | 'addMana' | 'addCritical' |
    'removeRandom' | 'removeRandomAddRandom' | 'removeRandomAddPhysical' | 'removeRandomAddMana' | 'removeRandomAddCritical';

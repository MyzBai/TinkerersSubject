

export default interface MinionsConfig {
    levelReq: number;
    list: (MinionConfig | MinionConfig[])[];
 }

export interface MinionConfig{
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    mods: string[];
    goldCost: number;
}
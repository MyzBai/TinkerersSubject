

export default interface CompanionsConfig {
    levelReq: number;
    list: (CompanionConfig | CompanionConfig[])[];
 }

export interface CompanionConfig{
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    mods: string[];
    goldCost: number;
}
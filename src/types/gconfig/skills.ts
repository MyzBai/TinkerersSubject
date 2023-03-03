export default interface SkillsConfig {
    attackSkills: {
        skillList: AttackSkillConfig[]
    };
    buffSkills?: {
        skillSlots: BuffSkillSlotConfig[];
        skillList: BuffSkillConfig[];
    }
}

export interface AttackSkillConfig{
    name: string;
    attackSpeed: number;
    manaCost: number;
    baseDamageMultiplier: number;
    levelReq: number;
    mods?: string[];
}

export interface BuffSkillSlotConfig{
    levelReq: number;
}
export interface BuffSkillConfig{
    name: string;
    baseDuration: number;
    manaCost: number;
    levelReq: number;
    mods?: string[];
}
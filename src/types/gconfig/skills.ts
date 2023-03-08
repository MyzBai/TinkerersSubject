export default interface SkillsConfig {
    attackSkills: {
        skillList: (AttackSkillConfig | AttackSkillConfig[])[]
    };
    buffSkills?: {
        skillSlots: BuffSkillSlotConfig[];
        skillList: (BuffSkillConfig | BuffSkillConfig)[];
    }
}

export interface AttackSkillConfig{
    name: string;
    attackSpeed: number;
    manaCost?: number;
    baseDamageMultiplier: number;
    levelReq?: number;
    mods?: string[];
    attackCountReq?: number;
}

export interface BuffSkillSlotConfig{
    levelReq: number;
}
export interface BuffSkillConfig{
    name: string;
    baseDuration: number;
    manaCost?: number;
    levelReq?: number;
    mods?: string[];
    triggerCountReq?: number;
}
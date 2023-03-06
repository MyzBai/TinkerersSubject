
export default interface SkillsSave {
    attackSkillSlot: AttackSkillSlot;
    attackSkillList: AttackSkill[];
    buffSkillSlotList: BuffSkillSlot[];
    buffSkillList: BuffSkill[];
}

interface AttackSkillSlot {
    name: string;
    rankIndex: number;
}
interface AttackSkill {
    name: string;
    rankProgress: number;
}
interface BuffSkillSlot {
    name: string;
    index: number;
    time: number;
    automate: boolean;
    running: boolean;
    rankIndex: number;
}
interface BuffSkill {
    name: string;
    rankProgress: number;
}
import type { Skills } from "@src/types/gconfig";
import { Modifier, StatModifier } from "../mods";
import { modDB, playerStats } from "../player";
import { Save } from "../save";
import { AttackSkillModal, BuffSkillModal } from "./skillModal";
import { AttackSkillSlot, BuffSkillSlot } from "./skillSlots";

let attackSkills: AttackSkill[];
let buffSkills: BuffSkill[];
let attackSkillSlot: AttackSkillSlot;
let buffSkillSlots: BuffSkillSlot[];

const attackSkillContainer = document.querySelector<HTMLElement>('.p-game .s-player .s-skills [data-attack-skill]')!;
const buffSkillList = document.querySelector<HTMLUListElement>('.p-game .s-player .s-skills ul[data-buff-skill-list]')!;

const attackSkillModal = new AttackSkillModal();
const buffSkillModal = new BuffSkillModal();

export function init(data: Skills) {

    attackSkills = [];
    buffSkills = [];
    buffSkillSlots = [];
    attackSkillContainer.replaceChildren();
    buffSkillList.replaceChildren();

    data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
    if (data.attackSkills.skillList[0].levelReq > 1) {
        throw Error('There must be an attack skill with a level requirement of 1');
    }

    attackSkills = data.attackSkills.skillList.map(x => new AttackSkill(x));
    attackSkillModal.init(attackSkills);
    attackSkillSlot = new AttackSkillSlot(attackSkills, attackSkillModal);
    attackSkillSlot.set(attackSkills[0]);


    if (data.buffSkills) {
        buffSkills = data.buffSkills.skillList.map(x => new BuffSkill(x));
        buffSkillModal.init(buffSkills);
        for (const skillSlot of data.buffSkills.skillSlots) {
            if (skillSlot.levelReq <= 1) {
                buffSkillSlots.push(new BuffSkillSlot(buffSkills, buffSkillModal));
                continue;
            }
            const listener = (level: number) => {
                if (level < skillSlot.levelReq) {
                    return;
                }
                buffSkillSlots.push(new BuffSkillSlot(buffSkills, buffSkillModal));
                playerStats.level.removeListener('change', listener);
            };
            playerStats.level.addListener('change', listener);
        }
    }
}

export function saveSkills(saveObj: Save) {
    saveObj.skills = {
        attackSkillName: attackSkillSlot.skill?.name || 'invalid name',
        buffSkillNames: buffSkillSlots.map(x => x.skill?.name || '').filter(x => x?.length > 0)
    }
}

export function loadSkills(saveObj: Save) {
    const attackSkill = attackSkills.find(x => x.name === saveObj.skills?.attackSkillName);
    attackSkillSlot.set(attackSkill || attackSkills[0]);
    buffSkillSlots.forEach((slot, index) => slot?.set(buffSkills.find(skill => skill.name === saveObj.skills?.buffSkillNames?.[index])));
}

interface SkillParams {
    readonly name: string;
    readonly levelReq: number;
    readonly manaCost: number;
    readonly mods?: string[];
}
interface AttackSkillParams extends SkillParams {
    readonly attackSpeed: number;
    readonly baseDamageMultiplier: number;
}
interface BuffSkillParams extends SkillParams {
    readonly baseDuration: number;
}

export class Skill {
    public readonly name: string;
    public readonly levelReq: number;
    public readonly manaCost: number;
    public readonly mods: Modifier[];
    constructor(args: SkillParams) {
        this.name = args.name;
        this.levelReq = args.levelReq;
        this.manaCost = args.manaCost;
        this.mods = args.mods?.map(x => new Modifier(x)) || [];
    }
    get sourceName() { return `Skill/${this.name}`; }
}

export class AttackSkill extends Skill {
    static active: AttackSkill;
    public readonly attackSpeed: number;
    public readonly baseDamageMultiplier: number;
    constructor(args: AttackSkillParams) {
        super(args);
        this.attackSpeed = args.attackSpeed;
        this.baseDamageMultiplier = args.baseDamageMultiplier;
    }

    enable() {
        modDB.removeBySource(AttackSkill.active?.sourceName);
        AttackSkill.active = this;

        modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.baseDamageMultiplier })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.attackSpeed })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.manaCost })], this.sourceName);

        this.mods.forEach(x => modDB.add(x.stats, this.sourceName));
    }
}

export class BuffSkill extends Skill {
    public readonly baseDuration: number;
    constructor(args: BuffSkillParams) {
        super(args);
        this.baseDuration = args.baseDuration;
    }
}

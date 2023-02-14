import type GConfig from "@src/types/gconfig";
import { queryHTML } from "@src/utils/helpers";
import type Game from "../game";
import { Modifier, StatModifier } from "../mods";
import { Modal } from "./skillModal";
// import type { Save } from "../saveGame";
import { AttackSkillSlot, BuffSkillSlot, SkillSlot } from "./skillSlots";

const attackSkillContainer = document.querySelector<HTMLElement>('.p-game .s-player .s-skills [data-attack-skill]')!;
const buffSkillList = document.querySelector<HTMLUListElement>('.p-game .s-player .s-skills ul[data-buff-skill-list]')!;

export interface ModalParams {
    canRemove: boolean;
    skills: Skill[];
    skillSlot: SkillSlot<Skill>;
}

export default class Skills {
    buffSkills: BuffSkill[];
    private buffSkillSlots: BuffSkillSlot[];
    modal: Modal;
    private readonly skillsData: GConfig['skills'];
    constructor(readonly game: Game) {
        this.skillsData = game.config.skills;
        this.modal = new Modal(game);
        this.buffSkills = [];
        this.buffSkillSlots = [];

        attackSkillContainer.replaceChildren();
        buffSkillList.replaceChildren();

        this.skillsData.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
        if (this.skillsData.attackSkills.skillList[0].levelReq > 1) {
            throw Error('There must be an attack skill with a level requirement of 1');
        }

        const attackSkills = this.skillsData.attackSkills.skillList.map(x => new AttackSkill(game, x));
        new AttackSkillSlot(game, attackSkills);

        this.modal = new Modal(game);

        if (this.skillsData.buffSkills) {
            const buffSkills = this.skillsData.buffSkills.skillList.map(x => new BuffSkill(x));
            for (const skillSlot of this.skillsData.buffSkills.skillSlots) {
                if (skillSlot.levelReq > 1) {
                    const listener = (level: number) => {
                        if (level < skillSlot.levelReq) {
                            return;
                        }
                        this.buffSkillSlots.push(new BuffSkillSlot(game, buffSkills));
                        game.player.stats.level.removeListener('change', listener);
                    };
                    game.player.stats.level.addListener('change', listener);

                } else {
                    this.buffSkillSlots.push(new BuffSkillSlot(game, buffSkills));
                }
            }
        }
    }

    // save(saveObj: Save) {
    //     saveObj.skills = {
    //         attackSkillName: this.attackSkillSlot.skill?.name || 'invalid name',
    //         buffSkillNames: this.buffSkillSlots.map(x => x.skill?.name || '').filter(x => x?.length > 0)
    //     }
    // }

    // load(saveObj: Save) {
    //     const attackSkill = this.attackSkills.find(x => x.name === saveObj.skills?.attackSkillName);
    //     this.attackSkillSlot.set(attackSkill || this.attackSkills[0]);
    //     this.buffSkillSlots.forEach((slot, index) => slot?.set(this.buffSkills.find(skill => skill.name === saveObj.skills?.buffSkillNames?.[index])));
    // }
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
    constructor(readonly game: Game, args: AttackSkillParams) {
        super(args);
        this.attackSpeed = args.attackSpeed;
        this.baseDamageMultiplier = args.baseDamageMultiplier;
    }

    enable() {
        this.game.player.modDB.removeBySource(AttackSkill.active?.sourceName);
        AttackSkill.active = this;

        this.game.player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.baseDamageMultiplier })], this.sourceName);
        this.game.player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.attackSpeed })], this.sourceName);
        this.game.player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.manaCost })], this.sourceName);

        this.mods.forEach(x => this.game.player.modDB.add(x.stats, this.sourceName));
    }
}

export class BuffSkill extends Skill {
    public readonly baseDuration: number;
    constructor(args: BuffSkillParams) {
        super(args);
        this.baseDuration = args.baseDuration;
    }
}

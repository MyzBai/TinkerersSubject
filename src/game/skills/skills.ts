// import type GConfig from "@src/types/gconfig";
// import type { Save } from "@src/types/save";
// import { queryHTML } from "@src/utils/helpers";
// import type Game from "../Game";
// import { Modifier, StatModifier } from "../mods";
// import modal from "./Modal";
// import { AttackSkillSlot, BuffSkillSlot } from "./SkillSlot";

// export default class Skills {
//     readonly attackSkillContainer = queryHTML('.p-game .s-player .s-skills [data-attack-skill]');
//     readonly buffSkillList = queryHTML('.p-game .s-player .s-skills ul[data-buff-skill-list]');
//     private attackSkillSlot: AttackSkillSlot | undefined;
//     private readonly buffSkillSlots: BuffSkillSlot[] = [];
//     private skillsData?: GConfig['skills'];
//     constructor(readonly game: Game) {
//         this.buffSkillSlots = [];
       
//     }

//     init() {
//         this.game.onSave.listen(this.save.bind(this));

//         this.skillsData = this.game.config.skills;
//         this.attackSkillContainer.replaceChildren();
//         this.buffSkillList.replaceChildren();

//         //AttackSkills
//         this.skillsData.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
//         if (this.skillsData.attackSkills.skillList[0].levelReq > 1) {
//             throw Error('There must be an attack skill with a level requirement of 1');
//         }
//         const attackSkills = this.skillsData.attackSkills.skillList.map(x => new AttackSkill(this.game, x));
//         this.createAttackSkillSlot(attackSkills);

//         // BuffSkills
//         this.buffSkillSlots.splice(0);
//         if (this.skillsData.buffSkills) {
//             this.skillsData.buffSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
//             const buffSkills = this.skillsData.buffSkills.skillList.map(x => new BuffSkill(x));
//             for (const skillSlot of this.skillsData.buffSkills.skillSlots) {
//                 if (skillSlot.levelReq > 1) {
//                     const listener = (level: number) => {
//                         if (level < skillSlot.levelReq) {
//                             return;
//                         }
//                         this.createBuffSkillSlot(buffSkills);
//                         this.game.player.stats.level.removeListener('change', listener);
//                     };
//                     this.game.player.stats.level.addListener('change', listener);

//                 } else {
//                     this.createBuffSkillSlot(buffSkills);

//                 }
//             }
//         }
//     }

//     save(saveObj: Save) {
//         saveObj.skills = {
//             attackSkillName: this.attackSkillSlot?.skill?.name || 'invalid name',
//             buffSkills: this.buffSkillSlots.filter(x => x.skill).map(x => {
//                 return {
//                     name: x.skill!.name,
//                     time: x.time,
//                     index: x.index
//                 };
//             })
//         }
//     }

//     private createAttackSkillSlot(skills: AttackSkill[]) {
//         const skillSlot = new AttackSkillSlot(this.game, skills);
//         this.attackSkillSlot = skillSlot;
//         return skillSlot;
//     }

//     private createBuffSkillSlot(buffSkills: BuffSkill[]) {
//         const index = this.buffSkillSlots.length;
//         const skillSlot = new BuffSkillSlot(this.game, buffSkills, index);
//         this.buffSkillSlots.push(skillSlot);
//         return skillSlot;
//     }

//     editSkill(skillSlot: AttackSkillSlot | BuffSkillSlot) {
//         modal.open({
//             skillSlot: skillSlot,
//             canRemove: skillSlot.type !== 'AttackSkill',
//             skills: skillSlot.skills.filter(x => x.levelReq <= this.game.player.stats.level.get()),
//             activeSkills: skillSlot.type === 'AttackSkill' ? [skillSlot.skill as Skill] : this.buffSkillSlots.filter(x => x.skill).map(x => x.skill!)
//         });
//     }
// }

// interface SkillParams {
//     readonly name: string;
//     readonly levelReq: number;
//     readonly manaCost: number;
//     readonly mods?: string[];
// }
// interface AttackSkillParams extends SkillParams {
//     readonly attackSpeed: number;
//     readonly baseDamageMultiplier: number;
// }
// interface BuffSkillParams extends SkillParams {
//     readonly baseDuration: number;
// }

// export class Skill {
//     public readonly name: string;
//     public readonly levelReq: number;
//     public readonly manaCost: number;
//     public readonly mods: Modifier[];
//     constructor(args: SkillParams) {
//         this.name = args.name;
//         this.levelReq = args.levelReq;
//         this.manaCost = args.manaCost;
//         this.mods = args.mods?.map(x => new Modifier(x)) || [];
//     }
//     get sourceName() { return `Skill/${this.name}`; }
// }

// export class AttackSkill extends Skill {
//     static active: AttackSkill;
//     public readonly attackSpeed: number;
//     public readonly baseDamageMultiplier: number;
//     constructor(readonly game: Game, args: AttackSkillParams) {
//         super(args);
//         this.attackSpeed = args.attackSpeed;
//         this.baseDamageMultiplier = args.baseDamageMultiplier;
//     }

//     enable() {
//         this.game.player.modDB.removeBySource(AttackSkill.active?.sourceName);
//         AttackSkill.active = this;

//         this.game.player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.baseDamageMultiplier })], this.sourceName);
//         this.game.player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.attackSpeed })], this.sourceName);
//         this.game.player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.manaCost })], this.sourceName);

//         this.mods.forEach(x => this.game.player.modDB.add(x.stats, this.sourceName));
//     }
// }

// export class BuffSkill extends Skill {
//     public readonly baseDuration: number;
//     constructor(args: BuffSkillParams) {
//         super(args);
//         this.baseDuration = args.baseDuration;
//     }
// }

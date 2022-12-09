import type { GConfig } from "@src/types/gconfig";
import { Modifier, StatModifier } from "../mods";
import { modDB } from "../player";

export default class AttackSkill {
    static active: AttackSkill;
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    manaCost: number;
    mods: Modifier[];
    constructor(args: GConfig['skills']['attackSkills']['skillList'][number]) {
        Object.assign(this, args, { mods: args.mods.map(x => new Modifier(x)) });


    }

    get sourceName() { return `Skills/Attack/${this.name}`; }

    enable() {
        modDB.removeBySource(AttackSkill.active?.sourceName);
        AttackSkill.active = this;

        modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.baseDamageMultiplier })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.attackSpeed })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.manaCost })], this.sourceName);

        this.mods.forEach(x => modDB.add(x.stats, this.sourceName));
    }

}
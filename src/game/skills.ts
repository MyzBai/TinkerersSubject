import { Skills } from "@public/gconfig/schema";
import { Modifier, StatModifier } from "@game/mods";
import { modDB, playerStats } from "@game/player";

document.querySelector('.p-skills .s-skill-info [data-enable]')?.addEventListener('click', () => {
    Skill.selected.enable();
});

export function init(data: Skills) {
    data.skillList.sort((a, b) => a.levelReq - b.levelReq);
    if (data.skillList[0].levelReq > 1) {
        throw new Error('Skill levelReq at 0 index must have a minimum value of 1');
    }

    const skills: Skill[] = [];
    for (const skillData of data.skillList) {
        const mods = skillData.mods?.map(x => new Modifier(x)) || [];
        const skill = new Skill({
            name: skillData.name,
            levelReq: skillData.levelReq,
            attackSpeed: skillData.attackSpeed,
            manaCost: skillData.manaCost,
            baseDamageMultiplier: skillData.baseDamageMultiplier,
            mods
        });

        skills.push(skill);
    }

    document.querySelector('.p-skills ul[data-skill-list]')?.replaceChildren(...skills.map(x => x.element));
    skills[0].select();
    skills[0].enable();


}

interface SkillParams {
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    manaCost: number;
    mods: Modifier[];
}

export class Skill {
    static enabled: Skill;
    static selected: Skill;
    #name: string;
    #levelReq: number;
    #attackSpeed: number;
    #baseDamageMultiplier: number;
    #manaCost: number;
    #mods: Modifier[];
    #element: HTMLElement;
    #unlockId: number;
    constructor(params: SkillParams) {
        this.#name = params.name;
        this.#levelReq = params.levelReq;
        this.#attackSpeed = params.attackSpeed;
        this.#baseDamageMultiplier = params.baseDamageMultiplier;
        this.#manaCost = params.manaCost;
        this.#mods = params.mods;

        this.#element = this.#createElement();

        this.#unlockId = playerStats.level.onChange.listen(() => this.#tryUnlock());
        this.#tryUnlock();
    }

    get name() { return this.#name; }
    get levelReq() { return this.#levelReq; }
    get attackSpeed() { return this.#attackSpeed; }
    get baseDamageMultiplier() { return this.#baseDamageMultiplier; }
    get manaCost() { return this.#manaCost; }
    get mods() { return this.#mods; }
    get element() { return this.#element; }
    get sourceName() { return `Skills/${this.#name}`; }

    select() {
        Skill.selected = this;
        document.querySelectorAll('.p-skills ul[data-skill-list] li').forEach(x => {
            x.classList.toggle('selected', x === this.#element);
        });
        this.show();
    }
    enable() {

        document.querySelectorAll('.p-skills ul[data-skill-list] li').forEach(x => {
            x.classList.toggle('enabled', x === this.#element);
        });

        modDB.removeBySource(Skill.enabled?.sourceName);
        Skill.enabled = this;

        modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.#baseDamageMultiplier })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.#attackSpeed })], this.sourceName);
        modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.#manaCost })], this.sourceName);

        this.mods.forEach(x => modDB.add(x.stats, this.sourceName));

        this.show();
    }
    show() {
        document.querySelector('.p-skills .s-skill-info [data-title]')!.textContent = this.#name;
        document.querySelector('.p-skills .s-skill-info [data-stat="attackSpeed"]')!.textContent = this.#attackSpeed.toFixed(2);
        document.querySelector('.p-skills .s-skill-info [data-stat="manaCost"]')!.textContent = this.#manaCost.toFixed(0);
        document.querySelector('.p-skills .s-skill-info [data-stat="baseDamageMultiplier"]')!.textContent = this.#baseDamageMultiplier.toFixed(0) + '%';

        const modElements: HTMLElement[] = [];
        for (const mod of this.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        document.querySelector('.p-skills .s-skill-info [data-mod-list]')?.replaceChildren(...modElements);

        const btn = (document.querySelector('.p-skills [data-enable]') as HTMLElement);
        btn.toggleAttribute('disabled', this === Skill.enabled);
        // btn.classList.toggle('enabled', skill === Skill.active);
        btn.textContent = this === Skill.enabled ? 'Enabled' : 'Enable';


        this.element.classList.toggle('enabled', this === Skill.enabled);
    }
    #tryUnlock() {
        if (this.#levelReq > playerStats.level.get()) {
            return;
        }
        this.#element.classList.remove('hidden');

        playerStats.level.onChange.removeListener(this.#unlockId);
    }
    #createElement() {
        const element = document.createElement('li');
        element.textContent = this.#name;
        element.classList.add('g-list-item', 'hidden');
        element.addEventListener('click', () => {
            document.querySelectorAll('.p-skills ul[data-skill-list]').forEach(x => {
                x.classList.toggle('selected', x === element);
            });
            this.select();
            this.show();
        });
        return element;
    }
}


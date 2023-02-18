import GConfig from "@src/types/gconfig";
import { Save } from "@src/types/save";
import { queryHTML } from "@src/utils/helpers";
import Game from "../Game";
import { ModDB, Modifier, StatModifier } from "../mods";
import Component from "./Component";

type SkillsData = Required<Required<GConfig>['components']>['skills'];
type AttackSkillData = SkillsData['attackSkills']['skillList'][number];
type BuffSkillData = Required<SkillsData>['buffSkills']['skillList'][number];

type SkillSlot = AttackSkillSlot | BuffSkillSlot;

export default class Skills extends Component {
    private readonly page = queryHTML('.p-game .p-skills');
    private readonly attackSkillSlotContainer = queryHTML('[data-attack-skill-slot]', this.page);
    private readonly buffSkillSlotContainer = queryHTML('.s-skill-slots [data-buff-skill-slots]', this.page);
    private readonly skillInfoContainer = queryHTML('[data-skill-info]', this.page);
    private readonly skillListContainer = queryHTML('.p-game .p-skills .s-skill-list ul', this.page);

    private activeSkillSlot: BaseSkillSlot;
    private readonly attackSkillSlot: AttackSkillSlot;
    private readonly buffSkillSlots: BuffSkillSlot[] = [];
    // private readonly abortController = new AbortController();
    constructor(readonly game: Game, readonly data: SkillsData) {
        super(game);

        //setup attack skills
        {
            const attackSkills = [...data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<AttackSkill>(x => new AttackSkill(this, x));
            this.attackSkillSlot = new AttackSkillSlot(this, attackSkills);
            this.attackSkillSlotContainer.replaceChildren(this.attackSkillSlot.element);
            this.attackSkillSlot.setSkill(attackSkills[0]);
            this.activeSkillSlot = this.attackSkillSlot;
            queryHTML('[data-skill-name]', this.attackSkillSlot.element).click();
        }

        //setup buff skills
        {
            this.buffSkillSlotContainer.replaceChildren();
            if (data.buffSkills) {
                const buffSkills = [...data.buffSkills.skillList.sort((a, b) => a.levelReq - b.levelReq)].map<BuffSkill>(x => new BuffSkill(x));
                for (const buffSkillData of data.buffSkills.skillSlots || []) {
                    game.player.stats.level.registerCallback(buffSkillData.levelReq, () => {
                        const slot = new BuffSkillSlot(this, buffSkills);
                        this.buffSkillSlotContainer.appendChild(slot.element);
                        this.buffSkillSlots.push(slot);
                    });
                }
            }
        }

    }

    dispose(): void {
        // this.abortController.abort();
    }

    selectSkillSlot(skillSlot: SkillSlot) {
        this.activeSkillSlot = skillSlot;
        [this.attackSkillSlot, ...this.buffSkillSlots].forEach(slot => slot.slotLabelElement.classList.toggle('selected', slot === skillSlot));
        this.populateSkillList(skillSlot);
    }

    private showSkill(skill: AttackSkill | BuffSkill) {
        const createTableRow = (label: string, value: string) => {
            const row = document.createElement('tr');
            row.insertAdjacentHTML('beforeend', `<td>${label}</td>`);
            row.insertAdjacentHTML('beforeend', `<td>${value}</td>`);
            return row;
        };

        queryHTML('header .title', this.skillInfoContainer).textContent = skill.data.name;

        const table = queryHTML('table', this.skillInfoContainer);
        table.replaceChildren();
        table.appendChild(createTableRow('Mana Cost', skill.data.manaCost.toFixed()));

        if (skill instanceof AttackSkill) {
            table.appendChild(createTableRow('Attack Speed', skill.data.attackSpeed.toFixed(2)));
            table.appendChild(createTableRow('Base Damage', skill.data.baseDamageMultiplier.toFixed() + '%'));
        } else if (skill instanceof BuffSkill) {
            table.appendChild(createTableRow('Duration', skill.data.baseDuration.toFixed() + 's'));
        }

        if (skill.data.mods) {
            const modElements: HTMLElement[] = [];
            for (const mod of skill.mods) {
                const modElement = document.createElement('div');
                modElement.classList.add('g-mod-desc');
                modElement.textContent = mod.desc;
                modElements.push(modElement);
            }
            for (let i = 0; i < 20; i++) {
                const modElement = document.createElement('div');
                modElement.classList.add('g-mod-desc');
                modElement.textContent = skill.mods[0].desc;
                modElements.push(modElement);

            }
            queryHTML('.s-mods', this.skillInfoContainer).replaceChildren(...modElements);
        }

        {
            const enableSkillButtonElement = queryHTML<HTMLButtonElement>('footer [data-enable]', this.skillInfoContainer);
            const clone = enableSkillButtonElement.cloneNode(true) as HTMLButtonElement;
            enableSkillButtonElement.replaceWith(clone);
            clone.addEventListener('click', () => {
                this.activeSkillSlot.setSkill(skill);
                clone.disabled = true;
                this.showSkill(skill);
            });
            clone.disabled = this.activeSkillSlot.skill === skill;
        }


        const removeSkillButtonElement = queryHTML<HTMLButtonElement>('footer [data-remove]', this.skillInfoContainer);
        const triggerSkillButtonElement = queryHTML<HTMLButtonElement>('footer [data-trigger]', this.skillInfoContainer);
        removeSkillButtonElement.classList.add('hidden');
        triggerSkillButtonElement.classList.add('hidden');
        if (skill instanceof BuffSkill && this.activeSkillSlot.skill === skill) {
            {
                //remove skill button
                const clone = removeSkillButtonElement.cloneNode(true) as HTMLButtonElement;
                removeSkillButtonElement.replaceWith(clone);
                clone.addEventListener('click', () => {
                    this.activeSkillSlot.setSkill(undefined);
                    this.showSkill(skill);
                });
                clone.classList.toggle('hidden', !this.activeSkillSlot.canRemove);
            }

            {
                //trigger skill button
                const clone = triggerSkillButtonElement.cloneNode(true) as HTMLButtonElement;
                triggerSkillButtonElement.replaceWith(clone);
                clone.addEventListener('click', () => {
                    skill.trigger();
                });
                clone.classList.toggle('hidden', !this.activeSkillSlot.canTrigger);
            }
        }
    }

    private populateSkillList(skillSlot: SkillSlot) {
        const elements: HTMLLIElement[] = [];
        for (const skill of skillSlot.skillList) {
            const li = document.createElement('li');
            li.classList.add('g-list-item');
            li.classList.toggle('selected', skill.data.name === skillSlot.skill?.data.name);
            li.setAttribute('data-name', skill.data.name);
            li.textContent = skill.data.name;
            li.addEventListener('click', () => {
                this.showSkill(skill);
                elements.forEach(x => x.classList.toggle('selected', x === li));
            });
            if (skill === skillSlot.skill) {
                li.click();
            }
            elements.push(li);
        }
        this.skillListContainer.replaceChildren(...elements);

        if (elements.length === 0) {
            this.skillListContainer.textContent = 'No skills available';
            return;
        }

        if (skillSlot.skill) {
            elements.find(x => x.getAttribute('data-name') === skillSlot.skill?.data.name)?.click();
        } else {
            elements[0].click();
        }

    }

    save(saveObj: Save) {
        // saveObj.skills = {
        //     attackSkillName: this.attackSkillSlot?.skill?.name || 'invalid name',
        //     buffSkills: this.buffSkillSlots.filter(x => x.skill).map(x => {
        //         return {
        //             name: x.skill!.name,
        //             time: x.time,
        //             index: x.index
        //         };
        //     })
        // }
    }
}

abstract class BaseSkillSlot {
    readonly element: HTMLElement;
    skill?: BaseSkill;
    protected _automate = false;
    constructor(readonly skills: Skills) {
        this.element = this.createElement();
    }
    setSkill(skill?: BaseSkill) {
        this.skill = skill;
        queryHTML('[data-skill-name]', this.element).textContent = skill?.data.name || '[Empty Slot]';
    }
    get hasSkill() { return typeof this.skill !== 'undefined'; }
    get canRemove() { return this.hasSkill }
    get automate() { return this._automate; }
    get slotLabelElement() { return queryHTML('[data-skill-name]', this.element); }
    get canTrigger() { return false; }

    protected createElement() {
        const li = document.createElement('li');
        li.classList.add('s-skill-slot');
        li.insertAdjacentHTML('beforeend', '<div class="g-list-item" data-skill-name></div>');
        if (this instanceof BuffSkillSlot) {
            {
                const autoButton = document.createElement('button');
                autoButton.classList.add('g-button');
                autoButton.textContent = 'Auto';
                autoButton.setAttribute('data-automate', '');
                autoButton.setAttribute('data-role', 'cancel');
                autoButton.addEventListener('click', () => {
                    this._automate = !this.automate;
                    autoButton.setAttribute('data-role', this.automate ? 'confirm' : 'cancel');
                    autoButton.classList.toggle('selected', this.automate);
                    this.skills.selectSkillSlot(this as unknown as BuffSkillSlot);
                });
                li.appendChild(autoButton);
            }
        }

        {
            const progressBar = document.createElement('progress');
            progressBar.max = 100;
            progressBar.value = 50;

            li.appendChild(progressBar);
        }
        return li;
    }
}

class AttackSkillSlot extends BaseSkillSlot {
    constructor(readonly skills: Skills, readonly skillList: AttackSkill[]) {
        super(skills);
        this.slotLabelElement.addEventListener('click', () => {
            this.skills.selectSkillSlot(this);
        });
    }

    setSkill(skill: AttackSkill) {
        this.skill?.removeModifiers();
        super.setSkill(skill);
        skill.applyModifiers();
    }
}

class BuffSkillSlot extends BaseSkillSlot {
    constructor(readonly skills: Skills, readonly skillList: BuffSkill[]) {
        super(skills);
        this.setSkill(undefined);
        this.slotLabelElement.addEventListener('click', () => {
            this.skills.selectSkillSlot(this);
        });
    }
    get automate() {
        return this.hasSkill && this._automate;
    }
    get canTrigger() {
        return this.hasSkill && !this.automate;
    }

    setSkill(skill?: BuffSkill) {
        this.skill = skill;
        queryHTML('[data-skill-name]', this.element).textContent = this.skill?.data.name || '[Empty Slot]';

        const automateButton = queryHTML('[data-automate]', this.element);
        this._automate = false;
        automateButton.classList.toggle('hidden', !this.hasSkill);
        automateButton.setAttribute('data-role', this.automate ? 'confirm' : 'cancel');
    }
}

abstract class BaseSkill {
    protected readonly _mods: Modifier[];
    constructor(readonly data: AttackSkillData | BuffSkillData) {
        this._mods = data.mods?.map(x => new Modifier(x)) || [];
    }
    get sourceName() {
        return `Skill/${this.data.name || '[error]'}`;
    }
    get mods() { return this._mods; }


    abstract removeModifiers(): void;
    abstract applyModifiers(): void;
}

class AttackSkill extends BaseSkill {
    constructor(readonly skills: Skills, readonly data: AttackSkillData) {
        super(data);
    }

    removeModifiers() {
        this.skills.game.player.modDB.removeBySource(this.sourceName);
    }

    applyModifiers() {
        const source = `Skill/${this.data.name}`;

        this.skills.game.player.modDB.removeBySource(source);

        this.skills.game.player.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', valueType: 'Base', value: this.data.baseDamageMultiplier })], this.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackSpeed', valueType: 'Base', value: this.data.attackSpeed })], this.sourceName);
        this.skills.game.player.modDB.add([new StatModifier({ name: 'AttackManaCost', valueType: 'Base', value: this.data.manaCost })], this.sourceName);

        this.mods.forEach(x => this.skills.game.player.modDB.add(x.stats, this.sourceName));
    }
}

class BuffSkill extends BaseSkill {
    constructor(readonly data: BuffSkillData) {
        super(data);
    }

    trigger() {
        console.log('trigger');
    }

    applyModifiers(): void {

    }

    removeModifiers(): void {

    }
}
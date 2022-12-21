import { queryHTML } from "@src/utils/helpers";
import { playerStats } from "../player";
import { AttackSkill, BuffSkill, Skill, } from "./skills";
import { SkillSlot, BuffSkillSlot } from "./skillSlots";


export abstract class Modal<T extends Skill> {
    protected readonly modalElement: HTMLElement;
    protected readonly skillInfoContainer: HTMLElement;
    protected skillListElements: HTMLLIElement[];
    protected skillSlot: SkillSlot<T> | undefined;
    protected skills: T[];
    constructor(modalElement: HTMLElement) {
        this.modalElement = modalElement;
        this.skills = [];
        this.skillInfoContainer = queryHTML('[data-skill-info]', this.modalElement);
        this.skillListElements = [];
        queryHTML('[data-value="cancel"]', this.modalElement).addEventListener('click', () => this.close());
    }

    init(skills: T[]) {
        this.skills = skills;
        this.skillListElements = this.createSkillListElements();
        queryHTML('[data-skill-list]', this.modalElement).replaceChildren(...this.skillListElements);
    }

    open(skillSlot: SkillSlot<T>) {
        this.skillInfoContainer.classList.add('hidden');
        this.skillSlot = skillSlot;
        const skillSlotParent = skillSlot.element.parentElement;
        if (!skillSlotParent) {
            throw Error('Skill slot has no parent');
        }
        const skillSlotNames = Array.from(skillSlotParent.children).map(x => x.getAttribute('data-skill-name'));
        for (const element of this.skillListElements) {
            const nameAttr = element.getAttribute('data-skill-name');
            const isUsed = skillSlotNames.some(x => x === nameAttr);
            element.toggleAttribute('disabled', isUsed);
            const skill = this.skills.find(x => x.name === nameAttr);
            if (!skill) {
                throw Error(`Could not find skill: ${nameAttr}`);
            }
            element.classList.toggle('hidden', skill.levelReq > playerStats.level.get());
        }

        if (skillSlot.skill) {
            const name = skillSlot.skill.name;
            this.skillListElements.find(x => x.getAttribute('data-skill-name') === name)?.click();
        } else {
            this.skillListElements.find(x => !x.classList.contains('.hidden'))?.click();
        }

        this.modalElement.classList.remove('hidden');
    }

    protected apply() {
        const selectedSkillNameAttr = queryHTML('[data-skill-list] [data-skill-name].selected', this.modalElement).getAttribute('data-skill-name');// this.modalElement.querySelector('[data-skill-list] [data-skill-name].selected').getAttribute('data-skill-name');
        const skill = this.skills.find(x => x.name === selectedSkillNameAttr);
        if (this.skillSlot && skill) {
            this.skillSlot.set(skill);
        }
        this.close();
    }

    protected remove() {
        if (this.skillSlot) {
            this.skillSlot.set(undefined);
        }
        this.close();
    }

    protected close() {
        this.modalElement.classList.add('hidden');
    }

    protected createSkillListElements() {
        const elements: HTMLLIElement[] = [];
        for (const skill of this.skills) {
            const li = document.createElement('li');
            li.textContent = skill.name;
            li.classList.add('g-button', 'g-list-item');
            li.setAttribute('data-skill-name', skill.name);
            elements.push(li);
        }
        return elements;
    }
}

export class AttackSkillModal extends Modal<AttackSkill> {
    private readonly applyButton: HTMLElement;
    constructor() {
        const modalElement = queryHTML('.p-combat [data-attack-skill-modal]');
        super(modalElement);
        this.applyButton = queryHTML('[data-value="apply"]', this.modalElement);
        this.applyButton.addEventListener('click', () => this.apply());
    }

    private updateFooterButtons(selectedSkill: AttackSkill) {
        this.applyButton.toggleAttribute('disabled', selectedSkill === this.skillSlot?.skill);
    }

    protected showInfo(skill: AttackSkill) {
        this.skillInfoContainer.classList.remove('hidden');
        queryHTML('[data-title]', this.skillInfoContainer).textContent = skill.name;
        queryHTML('[data-stat="attackSpeed"]', this.skillInfoContainer).textContent = skill.attackSpeed.toFixed(2);
        queryHTML('[data-stat="manaCost"]', this.skillInfoContainer).textContent = skill.manaCost.toFixed(0);
        queryHTML('[data-stat="baseDamageMultiplier"]', this.skillInfoContainer).textContent = skill.baseDamageMultiplier.toFixed(0) + '%';

        const modElements: HTMLElement[] = [];
        for (const mod of skill.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        queryHTML('[data-mod-list]', this.skillInfoContainer).replaceChildren(...modElements);
    }

    protected createSkillListElements() {
        const elements = super.createSkillListElements();
        elements.forEach(li => li.addEventListener('click', () => {
            this.skillListElements.forEach(x => x.classList.toggle('selected', x === li));
            const nameAttr = li.getAttribute('data-skill-name');
            const skill = this.skills.find(x => x.name === nameAttr);
            if(skill){
                this.showInfo(skill);
                this.updateFooterButtons(skill);
            }
        }));
        return elements;
    }

}

export class BuffSkillModal extends Modal<BuffSkill> {
    private applyButton: HTMLElement;
    private removeButton: HTMLElement;

    constructor() {
        const modalElement = queryHTML('.p-combat [data-buff-skill-modal]');
        super(modalElement);

        this.applyButton = queryHTML('[data-value="apply"]', this.modalElement);
        this.removeButton = queryHTML('[data-value="remove"]', this.modalElement);
        this.applyButton.addEventListener('click', () => this.apply());
        this.removeButton.addEventListener('click', () => this.remove());

    }

    open(skillSlot: BuffSkillSlot) {
        this.removeButton.toggleAttribute('disabled', skillSlot.skill === undefined);
        super.open(skillSlot);
    }

    private updateFooterButtons(selectedSkill: BuffSkill) {
        this.applyButton.toggleAttribute('disabled', selectedSkill === this.skillSlot?.skill);
    }

    protected showInfo(skill: BuffSkill) {
        this.skillInfoContainer.classList.remove('hidden');
        this.skillInfoContainer.classList.toggle('hidden', skill == null);
        if (!skill) {
            return;
        }
        queryHTML('[data-title]', this.skillInfoContainer).textContent = skill.name;
        queryHTML('[data-stat="baseDuration"', this.skillInfoContainer).textContent = `${skill.baseDuration}s`;
        queryHTML('[data-stat="manaCost"]', this.skillInfoContainer).textContent = skill.manaCost.toFixed(0);
        const modElements: HTMLElement[] = [];
        for (const mod of skill.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        queryHTML('[data-mod-list]', this.skillInfoContainer).replaceChildren(...modElements);
    }

    protected createSkillListElements() {
        const elements = super.createSkillListElements();
        elements.forEach(li => li.addEventListener('click', () => {
            this.skillListElements.forEach(x => x.classList.toggle('selected', x === li));
            const nameAttr = li.getAttribute('data-skill-name');
            const skill = this.skills.find(x => x.name === nameAttr);
            if(skill){
                this.showInfo(skill);
                this.updateFooterButtons(skill);
            }
        }));
        return elements;
    }
}
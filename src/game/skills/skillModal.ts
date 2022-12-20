import { playerStats } from "../player";
import { AttackSkill, BuffSkill, Skill, } from "./skills";
import { SkillSlot, AttackSkillSlot, BuffSkillSlot } from "./skillSlots";


export class Modal<T extends Skill> {
    protected readonly modalElement: HTMLElement;
    protected readonly skillInfoContainer: HTMLElement;
    protected skillListElements: HTMLLIElement[];
    protected skillSlot: SkillSlot<T>;
    protected skills: T[];
    constructor(modalElement: HTMLElement) {
        this.modalElement = modalElement;
        this.skillInfoContainer = this.modalElement.querySelector('[data-skill-info]');
        this.modalElement.querySelector('[data-value="cancel"]').addEventListener('click', () => {
            this.close();
        });
    }

    init(skills: T[]) {
        this.skills = skills;
        this.skillListElements = this.createSkillListElements();
        this.modalElement.querySelector('[data-skill-list]').replaceChildren(...this.skillListElements);
    }

    open(skillSlot: SkillSlot<T>) {
        this.skillInfoContainer.classList.add('hidden');
        this.skillSlot = skillSlot;
        const skillSlotNames = Array.from(skillSlot.element.parentElement.children).map(x => x.getAttribute('data-skill-name'));
        for (const element of this.skillListElements) {
            const nameAttr = element.getAttribute('data-skill-name');
            const isUsed = skillSlotNames.some(x => x === nameAttr);
            element.toggleAttribute('disabled', isUsed);
            const skill = this.skills.find(x => x.name === nameAttr);
            element.classList.toggle('hidden', skill.levelReq > playerStats.level.get());
        }
        this.skillListElements.find(x => !x.classList.contains('.hidden'))?.click();
        this.modalElement.classList.remove('hidden');
    }

    protected apply() {
        const selectedSkillNameAttr = this.modalElement.querySelector('[data-skill-list] [data-skill-name].selected').getAttribute('data-skill-name');
        const skill = this.skills.find(x => x.name === selectedSkillNameAttr);
        this.skillSlot.set(skill);
        this.close();
    }

    protected remove() {
        this.skillSlot.set(undefined);
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
    attackSkills: AttackSkill[];
    private applyButton: HTMLElement;
    constructor() {
        const modalElement = document.querySelector<HTMLDialogElement>('.p-combat [data-attack-skill-modal]');
        super(modalElement);

        this.applyButton = this.modalElement.querySelector<HTMLElement>('[data-value="apply"]');
        this.applyButton.addEventListener('click', () => this.apply());
    }

    private updateFooterButtons(selectedSkill: AttackSkill) {
        this.applyButton.toggleAttribute('disabled', selectedSkill === this.skillSlot.skill);
    }

    protected showInfo(skill: AttackSkill) {
        this.skillInfoContainer.classList.remove('hidden');
        this.skillInfoContainer.querySelector('[data-title]').textContent = skill.name;
        this.skillInfoContainer.querySelector('[data-stat="attackSpeed"]').textContent = skill.attackSpeed.toFixed(2);
        this.skillInfoContainer.querySelector('[data-stat="manaCost"]').textContent = skill.manaCost.toFixed(0);
        this.skillInfoContainer.querySelector('[data-stat="baseDamageMultiplier"]').textContent = skill.baseDamageMultiplier.toFixed(0) + '%';
        const modElements: HTMLElement[] = [];
        for (const mod of skill.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        this.skillInfoContainer.querySelector('[data-mod-list]').replaceChildren(...modElements);
    }

    protected createSkillListElements() {
        const elements = super.createSkillListElements();
        elements.forEach(li => li.addEventListener('click', () => {
            this.skillListElements.forEach(x => x.classList.toggle('selected', x === li));
            const nameAttr = li.getAttribute('data-skill-name');
            const skill = this.skills.find(x => x.name === nameAttr);
            this.showInfo(skill);
            this.updateFooterButtons(skill);
        }));
        return elements;
    }

}

export class BuffSkillModal extends Modal<BuffSkill> {
    private applyButton: HTMLElement;
    private removeButton: HTMLElement;

    constructor() {
        const modalElement = document.querySelector<HTMLDialogElement>('.p-combat [data-buff-skill-modal]');
        super(modalElement);

        this.applyButton = this.modalElement.querySelector('[data-value="apply"]');
        this.removeButton = this.modalElement.querySelector('[data-value="remove"]');

        this.applyButton.addEventListener('click', () => this.apply());
        this.removeButton.addEventListener('click', () => this.remove());

    }

    open(skillSlot: BuffSkillSlot) {
        this.removeButton.toggleAttribute('disabled', skillSlot.skill === undefined);
        super.open(skillSlot);
    }

    private updateFooterButtons(selectedSkill: BuffSkill) {
        this.applyButton.toggleAttribute('disabled', selectedSkill === this.skillSlot.skill);
        // this.removeButton.toggleAttribute('disabled', selectedSkill !== this.skillSlot.skill);
    }

    protected showInfo(skill: BuffSkill) {
        this.skillInfoContainer.classList.remove('hidden');
        this.skillInfoContainer.classList.toggle('hidden', skill == null);
        if (!skill) {
            return;
        }
        this.skillInfoContainer.querySelector('[data-title]').textContent = skill.name;
        this.skillInfoContainer.querySelector('[data-stat="baseDuration"]').textContent = `${skill.baseDuration}s`;
        this.skillInfoContainer.querySelector('[data-stat="manaCost"]').textContent = skill.manaCost.toFixed(0);
        const modElements: HTMLElement[] = [];
        for (const mod of skill.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        this.skillInfoContainer.querySelector('[data-mod-list]').replaceChildren(...modElements);
    }

    protected createSkillListElements() {
        const elements = super.createSkillListElements();
        elements.forEach(li => li.addEventListener('click', () => {
            this.skillListElements.forEach(x => x.classList.toggle('selected', x === li));
            const nameAttr = li.getAttribute('data-skill-name');
            const skill = this.skills.find(x => x.name === nameAttr);
            this.showInfo(skill);
            this.updateFooterButtons(skill);
        }));
        return elements;
    }
}
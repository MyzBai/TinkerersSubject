import { queryHTML } from "@src/utils/helpers";
import { AttackSkill, BuffSkill, Skill, } from "./Skills";
import type { SkillSlot } from "./SkillSlot";


export interface ModalOpenParams {
    skills: Skill[];
    activeSkills: Skill[];
    skillSlot: SkillSlot<Skill>;
    canRemove: boolean;
}



export class Modal {
    private modalElement = queryHTML('.p-game .p-combat [data-skill-modal]');
    private skillListContainer = queryHTML('[data-skill-list]', this.modalElement);
    private skillInfoContainer = queryHTML('[data-skill-info]', this.modalElement);
    private applyButton = queryHTML<HTMLButtonElement>('[data-apply]', this.modalElement);
    private removeButton = queryHTML('[data-remove]', this.modalElement);
    private cancelButton = queryHTML('[data-cancel]', this.modalElement);
    private _skillSlot: SkillSlot<Skill> | undefined;
    private selectedSkill: Skill | undefined;
    constructor() {
        this.applyButton.addEventListener('click', () => this.apply());
        this.removeButton.addEventListener('click', () => this.remove());
        this.cancelButton.addEventListener('click', () => this.cancel());
    }

    get skillSlot() {
        return this._skillSlot;
    }
    open(data: ModalOpenParams) {
        this._skillSlot = data.skillSlot;
        this.removeButton.classList.toggle('hidden', !data.canRemove);
        this.removeButton.toggleAttribute('disabled', this._skillSlot.skill === undefined);
        this.populateSkillList(data.skills, data.activeSkills);
        this.modalElement.classList.remove('hidden');
    }

    private populateSkillList(skills: Skill[], activeSkills: Skill[]) {
        const skillSlotNames = Array.from(this._skillSlot?.element.parentElement?.children || []).map(x => x.getAttribute('data-skill-name'));
        const elements = [] as HTMLLIElement[];
        for (const skill of skills) {
            const element = document.createElement('li');
            element.textContent = skill.name;
            element.classList.add('g-list-item');
            element.setAttribute('data-skill-name', skill.name);
            const isUsed = skillSlotNames.some(x => x === skill.name);
            element.toggleAttribute('disabled', isUsed);
            element.addEventListener('click', () => {
                this.showInfo(skill as AttackSkill | BuffSkill);
                elements.forEach(x => x.classList.toggle('selected', x === element));
                const canApply = activeSkills.every(x => x.name !== skill.name);
                this.applyButton.toggleAttribute('disabled', !canApply);
                let selectedSkill = skill;
                this.selectedSkill = selectedSkill;
            });
            elements.push(element);
        }
        this.skillListContainer.replaceChildren(...elements);
        if (this._skillSlot?.skill) {
            const element = this.skillListContainer.querySelector<HTMLElement>(`[data-skill-name="${this._skillSlot?.skill?.name}"]`);
            if (element)
                element.click();
        } else {
            elements[0]?.click();
        }
    }
    private showInfo(skill: AttackSkill | BuffSkill) {
        queryHTML('[data-title]').textContent = skill.name;
        queryHTML('[data-stat="manaCost"]', this.skillInfoContainer).textContent = skill.manaCost.toFixed();

        const attackSpeedElement = queryHTML('[data-stat="attackSpeed"]', this.skillInfoContainer);
        const baseDamageMultiplierElement = queryHTML('[data-stat="baseDamageMultiplier"]', this.skillInfoContainer);
        const baseDurationElement = queryHTML('[data-stat="baseDuration"]', this.skillInfoContainer);

        [attackSpeedElement,
            baseDamageMultiplierElement,
            baseDurationElement].forEach(x => x.parentElement?.classList.add('hidden'));

        if ((skill instanceof AttackSkill)) {
            attackSpeedElement.parentElement?.classList.remove('hidden');
            attackSpeedElement.textContent = skill.attackSpeed.toFixed(2);
            baseDamageMultiplierElement.parentElement?.classList.remove('hidden');
            baseDamageMultiplierElement.textContent = skill.baseDamageMultiplier.toFixed(0) + '%';
        } else if (skill instanceof BuffSkill) {
            baseDurationElement.parentElement?.classList.remove('hidden');
            baseDurationElement.textContent = `${skill.baseDuration.toFixed()}s`;
        }

        const modElements: HTMLElement[] = [];
        for (const mod of skill.mods) {
            const modElement = document.createElement('div');
            modElement.classList.add('g-mod-desc');
            modElement.textContent = mod.desc;
            modElements.push(modElement);
        }
        queryHTML('[data-mod-list]', this.skillInfoContainer).replaceChildren(...modElements);
    }
    private apply() {
        if (!this.selectedSkill || !this._skillSlot) {
            return;
        }
        this._skillSlot.set(this.selectedSkill);
        this.close();
    }
    private remove() {
        if (!this._skillSlot) {
            return;
        }
        this._skillSlot.set(undefined);
        this.close();
    }
    private cancel() {
        this.close();
    }
    private close() {
        this.modalElement.classList.add('hidden');
    }
}

export default new Modal();
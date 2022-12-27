import { queryHTML } from "@src/utils/helpers";
import { AttackSkill, BuffSkill, Skill, } from "./skills";
import type { SkillSlot } from "./skillSlots";


interface ModalData {
    skills: Skill[];
    skillSlot: SkillSlot<Skill>;
    canRemove: boolean;
}

export class Modal {
    private readonly modalElement = queryHTML('.p-game .p-combat [data-skill-modal]');
    private readonly skillListContainer = queryHTML('[data-skill-list]', this.modalElement);
    private readonly skillInfoContainer = queryHTML('[data-skill-info]', this.modalElement);
    private readonly applyButton = queryHTML('[data-value="apply"]', this.modalElement);
    private readonly removeButton = queryHTML('[data-value="remove"]', this.modalElement);
    private readonly cancelButton = queryHTML('[data-value="cancel"]', this.modalElement);
    private skillSlot: SkillSlot<Skill> | undefined;
    private selectedSkill: Skill | undefined;
    constructor() {
        this.applyButton.addEventListener('click', () => this.apply());
        this.removeButton.addEventListener('click', () => this.remove());
        this.cancelButton.addEventListener('click', () => this.cancel());
    }

    open(data: ModalData){
        this.skillSlot = data.skillSlot;
        this.removeButton.classList.toggle('hidden', !data.canRemove);
        this.removeButton.toggleAttribute('disabled', this.skillSlot.skill === undefined);
        this.populateSkillList(data.skills);
        this.modalElement.classList.remove('hidden');
    }

    private populateSkillList(skills: Skill[]) {
        const skillSlotNames = Array.from(this.skillSlot?.element.parentElement?.children || []).map(x => x.getAttribute('data-skill-name'));
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
                this.applyButton.toggleAttribute('disabled', skill === this.skillSlot?.skill);
                let selectedSkill = skill;
                this.selectedSkill = selectedSkill;
            });
            elements.push(element);
        }
        this.skillListContainer.replaceChildren(...elements);
        if(this.skillSlot?.skill){
            const element = this.skillListContainer.querySelector<HTMLElement>(`[data-skill-name="${this.skillSlot?.skill?.name}"]`);
            if(element)
            element.click();
        } else{
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
        if(!this.selectedSkill || !this.skillSlot){
            return;
        }
        this.skillSlot.set(this.selectedSkill);
        this.close();
    }
    private remove() {
        if(!this.skillSlot){
            return;
        }
        this.skillSlot.set(undefined);
        this.close();
    }
    private cancel() {
        this.close();
    }
    private close(){
        this.modalElement.classList.add('hidden');
    }
}

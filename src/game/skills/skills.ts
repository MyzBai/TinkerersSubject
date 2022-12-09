import type { GConfig, Skills } from "@src/types/gconfig";
import { Modifier, StatModifier } from "@game/mods";
import { modDB, playerStats } from "@game/player";
import { Save } from "../save";
import AttackSkill from './AttackSkill';


document.querySelector('.p-combat .s-player [data-attack-skill-modal] [data-apply]').addEventListener('click', x => attackSkillSlot.set((x.target as HTMLElement).getAttribute('data-skill-name')));


class AttackSkillSlot {
    skill = undefined as AttackSkill;
    skills = [] as AttackSkill[];
    constructor(readonly element: HTMLElement) {
        element.querySelector('button').addEventListener('click', () => openAttackSkillModal(this.skill));
    }
    set(name: string) {
        this.skill = this.skills.find(x => x.name === name);
        this.skill.enable();
        this.element.querySelector('[data-label]').textContent = name;
    }
}

const attackSkillSlot = new AttackSkillSlot(document.querySelector('.p-combat .s-player .s-skills [data-attack-skill]'));

export function init(data: Skills) {

    data.attackSkills.skillList.sort((a, b) => a.levelReq - b.levelReq);
    if (data.attackSkills.skillList[0].levelReq > 1) {
        throw Error('There must be an attack skill with a level requirement of 1');
    }
    const attackSkills = data.attackSkills.skillList.map(x => new AttackSkill(x));
    attackSkillSlot.skills = attackSkills;
    attackSkillSlot.set(attackSkills[0].name);

    setupAttackSkillModal(attackSkills);


}

function setupAttackSkillModal(attackSkills: AttackSkill[]) {
    const elements = [] as HTMLElement[];
    const modal = document.querySelector('.p-combat .s-player .s-skills [data-attack-skill-modal]');
    const activeSkillElement = modal.querySelector('[data-active-skill]');
    activeSkillElement.addEventListener('click', () => {
        elements.forEach(x => x.classList.remove('selected'));
        activeSkillElement.classList.add('selected');
        showAttackSkillModalInfo(attackSkillSlot.skill);
        modal.querySelector('[data-apply]').setAttribute('disabled', '');
    });
    for (const skill of attackSkills) {
        const element = document.createElement('li');
        element.classList.add('g-list-item');
        element.textContent = skill.name;
        element.setAttribute('data-skill-name', skill.name);
        element.addEventListener('click', () => {
            elements.forEach(x => x.classList.toggle('selected', x === element));
            activeSkillElement.classList.remove('selected');
            showAttackSkillModalInfo(skill);
            modal.querySelector('[data-apply]').removeAttribute('disabled');
        });
        elements.push(element);
    }
    document.querySelector('.p-combat .s-player .s-skills [data-attack-skill-modal] [data-skill-list]').replaceChildren(...elements);
}

function openAttackSkillModal(skill: AttackSkill) {
    const modal = document.querySelector('.p-game .s-player [data-attack-skill-modal]') as HTMLDialogElement;
    modal.querySelector('[data-active-skill]').textContent = skill.name;
    modal.querySelectorAll('[data-skill-list] [data-skill-name').forEach(x => x.classList.remove('hidden'));
    modal.querySelector(`[data-skill-list] [data-skill-name="${skill.name}"]`).classList.add('hidden');
    const selectedElement = document.querySelector('.p-game .s-player [data-attack-skill-modal] [data-skill-list] [data-skill-name].selected')
    if(!selectedElement){
        (modal.querySelector('[data-active-skill]') as HTMLElement).click();
    }
    modal.showModal();
}

function showAttackSkillModalInfo(skill: AttackSkill) {
    const modalInfo = document.querySelector('.p-game .s-player [data-attack-skill-modal] [data-skill-info]');
    modalInfo.querySelector('[data-title]').textContent = skill.name;
    modalInfo.querySelector('[data-stat="attackSpeed"]').textContent = skill.attackSpeed.toFixed(2);
    modalInfo.querySelector('[data-stat="manaCost"]').textContent = skill.manaCost.toFixed(0);
    modalInfo.querySelector('[data-stat="baseDamageMultiplier"]').textContent = skill.baseDamageMultiplier.toFixed(0) + '%';
    const modElements: HTMLElement[] = [];
    for (const mod of skill.mods) {
        const modElement = document.createElement('div');
        modElement.classList.add('g-mod-desc');
        modElement.textContent = mod.desc;
        modElements.push(modElement);
    }
    modalInfo.querySelector('[data-mod-list]').replaceChildren(...modElements);

    document.querySelector('.p-game .s-player [data-attack-skill-modal] [data-apply]').setAttribute('data-skill-name', skill.name);
}

export function saveSkills(saveObj: Save) {
    // saveObj.skills = {
    //     activeSkillName: Skill.enabled.name
    // }
}

export function loadSkills(saveObj: Save) {
    // const skill = skills.find(x => x.name === saveObj.skills.activeSkillName) || skills[0];
    // skill.select();
    // skill.enable();
}

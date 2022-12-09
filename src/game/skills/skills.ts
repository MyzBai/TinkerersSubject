import type { GConfig, Skills } from "@src/types/gconfig";
import { Modifier, StatModifier } from "@game/mods";
import { modDB, playerStats } from "@game/player";
import { Save } from "../save";
import { init as initAttackSkills } from './attacks';

document.querySelector('.p-skills .s-skill-info [data-enable]')?.addEventListener('click', () => Skill.selected.enable());

const skills: Skill[] = [];

export function init(data: Skills) {
    data.skillList.sort((a, b) => a.levelReq - b.levelReq);
    if (data.skillList[0].levelReq > 1) {
        throw new Error('Skill levelReq at 0 index must have a minimum value of 1');
    }

    initAttackSkills(data.skillList);
    for (const skillData of data.skillList) {
        const skill = new Skill(skillData);

        skills.push(skill);
    }

    document.querySelector('.p-skills ul[data-skill-list]')?.replaceChildren(...skills.map(x => x.element));
    skills[0].select();
    skills[0].enable();
}

function openModal(){
    
}

export function saveSkills(saveObj: Save) {
    saveObj.skills = {
        activeSkillName: Skill.enabled.name
    }
}

export function loadSkills(saveObj: Save) {
    const skill = skills.find(x => x.name === saveObj.skills.activeSkillName) || skills[0];
    skill.select();
    skill.enable();
}

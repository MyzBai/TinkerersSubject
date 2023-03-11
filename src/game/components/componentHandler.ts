import Skills, { SkillsConfig } from "./skills/Skills";
import Items, { ItemsConfig, ItemsSave } from "./items/Items";
import type Component from "./Component";
import Passives, { PassivesConfig, PassivesSave } from "./Passives";
import Achievements, { AchievementsConfig } from "./Achievements";
import Missions, { MissionsConfig, MissionsSave } from "./Missions";
import Minions, { MinionsConfig, MinionsSave } from "./Minions";

import skillsHtml from '@html/skills.html';
import passivesHtml from '@html/passives.html';
import itemsHtml from '@html/items.html';
import missionsHtml from '@html/missions.html';
import achievementsHtml from '@html/achievements.html';
import minionsHtml from '@html/minions.html';

import { querySelector } from "@src/utils/helpers";
import CustomError from "@src/utils/CustomError";
import Game from "../Game";

export { SkillsConfig };
export { ItemsConfig, ItemsSave };
export { PassivesConfig, PassivesSave };
export { AchievementsConfig };
export { MissionsConfig, MissionsSave };
export { MinionsConfig, MinionsSave };

export type ComponentName = { [K in keyof Required<ComponentsConfig>]: K }[keyof ComponentsConfig];

export interface ComponentWrapper {
    html: string;
    constr: new (data: unknown) => Component;
    label: string;
}

export interface ComponentsConfig {
    skills: SkillsConfig;
    passives?: PassivesConfig;
    items?: ItemsConfig;
    missions?: MissionsConfig;
    achievements?: AchievementsConfig;
    minions?: MinionsConfig;
}

export const componentConfigs: Record<keyof ComponentsConfig, ComponentWrapper> = {
    skills: {
        constr: Skills as (new() => Skills),
        html: skillsHtml,
        label: 'Skills'
    },
    passives: {
        constr: Passives as (new() => Passives),
        html: passivesHtml,
        label: 'Passives'
    },
    items: {
        constr: Items as (new() => Items),
        html: itemsHtml,
        label: 'Items'
    },
    missions: {
        constr: Missions as (new() => Missions),
        html: missionsHtml,
        label: 'Missions'
    },
    minions: {
        constr: Minions as (new() => Minions),
        html: minionsHtml,
        label: 'Minions'
    },
    achievements: {
        constr: Achievements as (new() => Achievements),
        html: achievementsHtml,
        label: 'Achievements'
    }
};



export function loadComponent(key: ComponentName) {
    const gamePage = querySelector('.p-game');
    const menuContainer = gamePage.querySelectorForce('[data-main-menu] .s-components');
    const mainView = gamePage.querySelectorForce('[data-main-view]');

    const { constr, html, label } = componentConfigs[key];

    //page
    const page = new DOMParser().parseFromString(html, 'text/html').querySelector(`.p-${key}`);
    if (!page || !(page instanceof HTMLElement)) {
        throw new CustomError(`invalid html of component: ${key}`);
    }
    mainView.appendChild(page);
    //menu item
    const menuItem = document.createElement('li');
    menuItem.textContent = label;
    menuItem.classList.add('g-list-item');
    menuItem.setAttribute('data-tab-target', key);
    menuContainer.appendChild(menuItem);
    {
        const keys = Object.keys(componentConfigs);
        const sort = (a: ComponentName, b: ComponentName) => keys.indexOf(a) - keys.indexOf(b);
        const sortedItems = [...menuContainer.children].sort((a, b) =>
            sort(a.getAttribute('data-tab-target') as ComponentName, b.getAttribute('data-tab-target') as ComponentName));
        menuContainer.replaceChildren(...sortedItems);
    }

    //instance
    const instance = new constr(Game.config!.components![key]);


    return instance;
}

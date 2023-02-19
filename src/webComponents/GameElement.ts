import html from './html/game.html';
import skillsHtml from './html/skills.html';
import passivesHtml from './html/passives.html';
import itemsHtml from './html/items.html';
import missionsHtml from './html/missions.html';
import achievementsHtml from './html/achievements.html';
import prestigeHtml from './html/prestige.html';
import type { ComponentName } from '@src/types/gconfig';
import { queryHTML, registerTabs } from '@src/utils/helpers';

interface ComponentData {
    name: string;
    targetName: string;
    html: string;
}

const componentDataList: { [K in ComponentName]: ComponentData } = {
    skills: {
        html: skillsHtml,
        name: 'Skills',
        targetName: 'skills'
    },
    passives: {
        html: passivesHtml,
        name: 'Passives',
        targetName: 'passives'
    },
    items: {
        html: itemsHtml,
        name: 'Items',
        targetName: 'items'
    },
    missions: {
        html: missionsHtml,
        name: 'Missions',
        targetName: 'missions'
    },
    achievements: {
        html: achievementsHtml,
        name: 'Achievements',
        targetName: 'achievements'
    },
    prestige: {
        html: prestigeHtml,
        name: 'Prestige',
        targetName: 'prestige'
    },
}

export class GameElement extends HTMLElement {

    componentPages: Element[] = [];
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = html;
    }

    init(names: ComponentName[]) {
        const container = queryHTML('[data-main-view]', this);
        const menu = queryHTML('.p-game > menu');
        menu.replaceChildren();

        this.componentPages.forEach(x => x.remove());

        menu.appendChild(this.createMenuItem('Combat', 'combat'));
        for (const name of names) {
            const componentData = componentDataList[name];
            const element = new DOMParser().parseFromString(componentData.html, 'text/html').body.firstElementChild;
            if (!element) {
                throw Error('invalid component html');
            }
            this.componentPages.push(element);
            container.appendChild(element);
            menu.appendChild(this.createMenuItem(componentData.name, componentData.targetName));
        }

        menu.appendChild(this.createMenuItem('Statistics', 'statistics'));
        menu.appendChild(this.createMenuItem('Settings', 'settings'));

        registerTabs(menu, queryHTML('.p-game', this));
    }

    private createMenuItem(label: string, targetName: string) {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-tab-target', targetName);
        li.textContent = label;

        return li;
    }
}

customElements.define('game-element', GameElement);
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import Component from "./Component";
import game, { Save } from "../Game";
import { Modifier } from "../mods";
import Task from "../Task";
import Player from "../Player";


export default class Achievements extends Component {
    readonly achievements: Achievement[] = [];
    constructor(readonly data: AchievementsConfig) {
        super('achievements');

        for (const achievementData of data.list) {
            const achievement = new Achievement(this, achievementData);
            this.achievements.push(achievement);
            achievement.updateLabel();
        }

        game.gameLoop.subscribe(() => {
            this.achievements.forEach(x => {
                x.tryCompletion();
            });
        }, { intervalMilliseconds: 1000 });

        game.visiblityObserver.registerLoop(this.page, visible => {
            if (visible) {
                this.achievements.forEach(x => x.updateLabel());
            }
        }, { intervalMilliseconds: 1000 });

        querySelector('.p-game .p-achievements ul').append(...this.achievements.map(x => x.element));
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    save(_saveObj: Save): void {
    }

}

class Achievement {
    readonly task: Task;
    readonly element: HTMLElement;
    private completed = false;
    constructor(readonly achievements: Achievements, readonly data: AchievementConfig) {
        this.element = this.createElement();
        this.task = new Task(data.description);
        //always start from 0 because it's being calculated from saved statistics and thus no need to save any achievement progress
        this.task.startValue = 0;

        this.tryCompletion();
    }
    get taskCompleted() {
        return this.task.completed;
    }
    tryCompletion() {
        if (!this.taskCompleted || this.completed) {
            return;
        }

        if (this.data.modList) {
            const modifiers = this.data.modList.flatMap(x => new Modifier(x).stats);
            const source = `Achievement/${this.data.description}`;
            Player.modDB.add(modifiers, source);
        }
        highlightHTMLElement(this.achievements.menuItem, 'click');
        highlightHTMLElement(this.element, 'mouseover');
        this.updateLabel();
        this.completed = true;
    }

    updateLabel() {
        if (this.completed) {
            return;
        }
        const label = this.element.querySelectorForce('[data-label]');
        const descElement = document.createElement('span');
        descElement.textContent = this.task.textData.labelText + ' ';
        descElement.setAttribute('data-desc', '');

        const varElement = document.createElement('var');
        if (!this.task.completed) {
            varElement.insertAdjacentHTML('beforeend', `<span data-cur-value>${this.task.value.toFixed()}</span>`);
            varElement.insertAdjacentHTML('beforeend', `<span>/</span>`);
        } else {
            varElement.setAttribute('data-valid', '');
        }
        varElement.insertAdjacentHTML('beforeend', `<span data-target-value>${this.task.textData.valueText}</span></var>`);

        label.replaceChildren(descElement, varElement);
    }

    private createElement() {
        const accordion = document.createElement('li');
        accordion.classList.add('g-accordion');
        const header = document.createElement('div');
        accordion.appendChild(header);
        header.classList.add('header');
        header.insertAdjacentHTML('beforeend', `<div data-label></div>`);

        if (this.data.modList) {
            const content = document.createElement('div');
            accordion.appendChild(content);
            content.classList.add('content');
            for (const mod of this.data.modList) {
                content.insertAdjacentHTML('beforeend', `<div class="g-mod-desc">${mod.replace(/[{}]/g, '')}</div>`);
            }
            header.insertAdjacentHTML('beforeend', `<i></i>`);
            header.addEventListener('click', () => {
                header.toggleAttribute('data-open');
            });
        }
        return accordion;
    }
}

export interface AchievementsConfig {
    list: AchievementConfig[]
}

export interface AchievementConfig{
    description: string;
    modList?: string[];
}


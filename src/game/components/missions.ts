// import type GConfig from '@src/types/gconfig';
// import { highlightHTMLElement, queryHTML } from '@src/utils/helpers';
// import { visibilityObserver } from '@src/utils/Observers';
// import type Game from '../game';
// import gameLoop from '../gameLoop';
// import { playerStats } from '../player';
// import type { Save } from '../saveGame';
// import Task from '../Task';

import type GConfig from "@src/types/gconfig";
import type { Save } from "@src/types/save";
import { queryHTML } from "@src/utils/helpers";
import { visibilityObserverLoop } from "@src/utils/Observers";
import Component from "./Component";
import type Game from "../Game";
import Task from "../Task";

// const missionListContainer = queryHTML('.p-game .p-missions ul[data-mission-list]');
// const missionsMenuButton = queryHTML('.p-game > menu [data-tab-target="missions"]')!;
type MissionsData = Required<Required<GConfig>['components']>['missions'];
type MissionData = MissionsData['missionLists'][number][number];

export default class Missions extends Component {
    private readonly missionsListContainer = queryHTML<HTMLUListElement>('.p-game .p-missions ul[data-mission-list]');
    readonly slots: MissionSlot[] = [];
    readonly observer: IntersectionObserver;
    constructor(readonly game: Game, readonly data: MissionsData) {
        super(game);

        for (const [i, slotData] of data.slots.entries()) {
            game.player.stats.level.registerCallback(slotData.levelReq, () => {
                const slot = new MissionSlot(this, slotData.cost);
                this.slots.push(slot);
                this.missionsListContainer.appendChild(slot.element);
            });
        }

        this.observer = visibilityObserverLoop(queryHTML('.p-game .p-missions'), () => {
            this.slots.forEach(x => {
                x.updateLabel();
            });
        }, { intervalMilliseconds: 1000 }).observer;

        game.gameLoop.subscribe(() => { this.slots.forEach(x => x.tryCompletion()); }, { intervalMilliseconds: 1000 });


        queryHTML('.p-game [data-main-menu] [data-tab-target="missions"]').classList.remove('hidden');
    }

    dispose(): void {
        this.missionsListContainer.replaceChildren();
        queryHTML('.p-game [data-main-menu] [data-tab-target="missions"]').classList.add('hidden');
    }

    save(saveObj: Save): void {

        saveObj.missions = (() => {
            const list: Required<Save>['missions']['missions'] = [];
            this.slots.forEach((slot, i) => {
                if (!slot.task) {
                    return;
                }
                list.push({
                    desc: slot.task.text,
                    index: i,
                    startValue: slot.task.startValue
                });
            });
            return { missions: list };
        })() as Save['missions'];
    }

}

class MissionSlot {
    private _task: Task | undefined;
    private _missionData: MissionData | undefined;
    private _element: HTMLLIElement;
    private completed = false;
    constructor(readonly missions: Missions, readonly unlockCost: number) {
        this._element = this.createElement();
        missions.game.player.stats.gold.addListener('change', () => {
            this.setNewButton();
        });
        const savedSlot = missions.game.saveObj.missions?.missions.find(x => x.index === missions.slots.length);
        if (savedSlot) {
            this.unlock();
            this._task = new Task(missions.game, savedSlot.desc);
            this._task.startValue = savedSlot.startValue;
        }
    }
    get element() {
        return this._element;
    }
    get missionData() { return this._missionData; }
    get newMissionCost() { return Math.ceil((this._missionData?.goldAmount || 0) * 0.1); }
    get task() { return this._task; }
    get taskCompleted() { return this._task?.completed; }

    tryCompletion() {
        if (!this.taskCompleted || this.completed) {
            return;
        }
        this.completed = true;
        // highlightHTMLElement(missionsMenuButton, 'click');
        // highlightHTMLElement(this.element, 'mouseover');
        this.setNewButton();
        this.setClaimButton(true);
    }

    unlock() {
        if (this._task) {
            return;
        }

        queryHTML<HTMLButtonElement>('[data-trigger="buy"]', this._element).remove();

        const buttonClaim = document.createElement('button');
        buttonClaim.classList.add('g-button');
        buttonClaim.setAttribute('data-trigger', 'claim');
        buttonClaim.insertAdjacentHTML('beforeend', '<span>Claim</span>');
        buttonClaim.insertAdjacentHTML('beforeend', `<span class="g-gold" data-cost></span>`);
        buttonClaim.addEventListener('click', () => this.claim());

        const buttonNew = document.createElement('button');
        buttonNew.classList.add('g-button');
        buttonNew.setAttribute('data-trigger', 'new');
        buttonNew.insertAdjacentHTML('beforeend', '<span>New</span>');
        buttonNew.insertAdjacentHTML('beforeend', `<span class="g-gold" data-cost></span>`);
        buttonNew.addEventListener('click', () => {
            this.missions.game.player.stats.gold.subtract(this.newMissionCost);
            this.generateRandomMission();
        });

        this._element.appendChild(buttonClaim);
        this._element.appendChild(buttonNew);

        this.generateRandomMission();
    }

    load({ task, missionData }: { task: Task, missionData: MissionData }) {
        this._task = task;
        this._missionData = missionData;
        this.tryCompletion();
    }

    private claim() {
        if (!this._missionData) {
            return;
        }
        this.missions.game.player.stats.gold.add(this._missionData.goldAmount)
        this.generateRandomMission();
        this.setClaimButton(false);
        this.completed = false;
    }

    generateRandomMission() {

        const missionDataArr = this.missions.data.missionLists.reduce((a, c) => {
            const missionData = c.filter(x => x.levelReq <= this.missions.game.player.stats.level.get()).sort((a, b) => b.levelReq - a.levelReq)[0];
            if (missionData) {
                a.push(missionData);
            }
            return a;
        }, []);
        if (missionDataArr.length === 0) {
            throw Error('No missions available');
        }
        const index = Math.floor(Math.random() * missionDataArr.length);
        this._missionData = missionDataArr[index];
        const description = this._missionData.description;
        this._task = new Task(this.missions.game, description);

        const id = this.missions.game.gameLoop.subscribe(() => {
            if (this._task?.completed) {
                this.missions.game.gameLoop.unsubscribe(id);
                this.setClaimButton(true);
            }
        }, { intervalMilliseconds: 1000 });

        this.updateLabel();
        this.setClaimButton(false);
        this.setNewButton();
    }

    updateLabel() {
        if (!this._task) {
            return;
        }
        const label = queryHTML('[data-label]', this._element);
        const descElement = document.createElement('span');
        descElement.textContent = this._task.textData.labelText + ' ';
        descElement.setAttribute('data-desc', '');

        const varElement = document.createElement('var');
        if (!this._task.completed) {
            varElement.insertAdjacentHTML('beforeend', `<span data-cur-value>${this._task.value.toFixed()}</span>`);
            varElement.insertAdjacentHTML('beforeend', `<span>/</span>`);
        } else {
            varElement.setAttribute('data-valid', '');
        }
        varElement.insertAdjacentHTML('beforeend', `<span data-target-value>${this._task.textData.valueText}</span></var>`);

        label.replaceChildren(descElement, varElement);
    }

    private setClaimButton(enabled: boolean) {
        if (!this._missionData) {
            return;
        }
        const element = queryHTML<HTMLButtonElement>('[data-trigger="claim"]', this._element);
        queryHTML('[data-cost]', this.element).textContent = this._missionData.goldAmount.toFixed();
        element.disabled = !enabled;
    }

    private setNewButton() {
        if (!this._missionData || !this._task) {
            return;
        }
        const element = queryHTML<HTMLButtonElement>('[data-trigger="new"]', this._element);
        queryHTML<HTMLSpanElement>('[data-cost]', this._element).textContent = this.newMissionCost.toFixed();;
        element.disabled = this._task.completed || this.missions.game.player.stats.gold.get() < this.newMissionCost;
    }

    private createElement() {
        const li = document.createElement('li');
        const label = document.createElement('div');
        label.textContent = '[Locked]';
        label.setAttribute('data-label', '');

        const button = document.createElement('button');
        button.classList.add('g-button');
        button.insertAdjacentHTML('beforeend', `<span>Buy</span>`);
        button.insertAdjacentHTML('beforeend', `<span class="g-gold" data-cost>${this.unlockCost}</span>`);
        button.setAttribute('data-trigger', 'buy');
        button.addEventListener('click', () => { this.unlock() });

        this.missions.game.player.stats.gold.registerCallback(this.unlockCost, () => {
            button.disabled = false;
        });

        li.appendChild(label);
        li.appendChild(button);
        return li;
    }
}
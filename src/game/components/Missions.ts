import type GConfig from "@src/types/gconfig";
import type { Save } from "@src/types/save";
import { querySelector } from "@src/utils/helpers";
import Component from "./Component";
import type Game from "../Game";
import Task from "../Task";

type MissionsData = Required<Required<GConfig>['components']>['missions'];
type MissionData = MissionsData['missionLists'][number][number];

export default class Missions extends Component {
    readonly slots: MissionSlot[] = [];
    private readonly missionsListContainer = querySelector<HTMLUListElement>('ul[data-mission-list]', this.page);
    constructor(readonly game: Game, readonly data: MissionsData) {
        super(game, 'missions');

        for (const slotData of data.slots) {
            game.player.stats.level.registerCallback(slotData.levelReq, () => {
                const slot = new MissionSlot(this, slotData.cost);
                this.slots.push(slot);
                this.missionsListContainer.appendChild(slot.element);
            });
        }

        game.gameLoop.subscribe(() => { this.slots.forEach(x => x.tryCompletion()); }, { intervalMilliseconds: 1000 });

        game.visiblityObserver.registerLoop(this.page, visible => {
            if (visible) {
                this.slots.forEach(x => x.updateLabel());
            }
        }, { intervalMilliseconds: 1000 });

        querySelector('.p-game > menu [data-tab-target="missions"]').classList.remove('hidden');
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
            this.updateLabel();
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

        querySelector<HTMLButtonElement>('[data-trigger="buy"]', this._element).remove();

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
        if (!this._missionData) {
            throw Error('missing mission data');
        }
        const description = this._missionData.description || 'Error';
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
        const label = querySelector('[data-label]', this._element);
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
        const element = querySelector<HTMLButtonElement>('[data-trigger="claim"]', this._element);
        querySelector('[data-cost]', element).textContent = this._missionData.goldAmount.toFixed();
        element.disabled = !enabled;
    }

    private setNewButton() {
        if (!this._missionData || !this._task) {
            return;
        }
        const element = querySelector<HTMLButtonElement>('[data-trigger="new"]', this._element);
        querySelector<HTMLSpanElement>('[data-cost]', element).textContent = this.newMissionCost.toFixed();
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
        button.addEventListener('click', () => {
            this.missions.game.player.stats.gold.subtract(this.unlockCost);
            this.unlock();
        });
        button.disabled = true;
        this.missions.game.player.stats.gold.addListener('change', amount => {
            button.disabled = amount < this.unlockCost;
        });

        li.appendChild(label);
        li.appendChild(button);
        return li;
    }
}
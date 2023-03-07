import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import Component from "./Component";
import type Game from "../Game";
import Task from "../Task";
import type MissionsConfig from "@src/types/gconfig/missions";
import type { MissionConfig } from "@src/types/gconfig/missions";
import type GameSave from "@src/types/save/save";


export default class Missions extends Component {
    readonly slots: MissionSlot[] = [];
    private readonly missionsListContainer = querySelector<HTMLUListElement>('ul[data-mission-list]', this.page);
    constructor(readonly game: Game, readonly data: MissionsConfig) {
        super(game, 'missions');

        for (const slotData of data.slots) {
            game.statistics.statistics.Level.registerCallback(slotData.levelReq, () => {
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

    save(saveObj: GameSave): void {
        saveObj.missions = {
            missions: this.slots.reduce<Required<GameSave>['missions']['missions']>((a, c) => {
                if (c.task) {
                    a.push({ desc: c.task.text || '', startValue: c.task.startValue || 0 });
                }
                return a;
            }, [])
        }
    }

}

class MissionSlot {
    private _task: Task | undefined;
    private _missionData: MissionConfig | undefined;
    private _element: HTMLLIElement;
    private completed = false;
    constructor(readonly missions: Missions, readonly unlockCost: number) {
        this._element = this.createElement();
        missions.game.statistics.statistics.Gold.addListener('change', () => {
            this.updateNewButton();
        });
        this.tryLoad();

        highlightHTMLElement(this.missions.menuItem, 'click');
        highlightHTMLElement(this.element, 'mouseover');
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
        highlightHTMLElement(this.missions.menuItem, 'click');
        highlightHTMLElement(this.element, 'mouseover');
        console.log('add highlight');
        this.updateSlot();
    }

    private unlock() {

        this._element.querySelector('[data-trigger="buy"]')?.remove();

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
            this.missions.game.statistics.statistics.Gold.subtract(this.newMissionCost);
            this.generateRandomMission();
        });

        this._element.appendChild(buttonClaim);
        this._element.appendChild(buttonNew);
    }

    private claim() {
        if (!this._missionData) {
            return;
        }
        this.missions.game.statistics.statistics.Gold.add(this._missionData.goldAmount);
        this.generateRandomMission();
        this.completed = false;
    }

    private generateRandomMission() {

        const missionDataArr = this.missions.data.missionLists.reduce((a, c) => {
            const missionData = c.filter(x => x.levelReq <= this.missions.game.statistics.statistics.Level.get()).sort((a, b) => b.levelReq - a.levelReq)[0];
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
                this.updateSlot();
            }
        }, { intervalMilliseconds: 1000 });

        this.updateSlot();
    }

    private updateSlot() {
        this.updateLabel();
        this.updateClaimButton();
        this.updateNewButton();
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

    private updateClaimButton() {
        if (!this._missionData || !this._task) {
            return;
        }
        const element = querySelector<HTMLButtonElement>('[data-trigger="claim"]', this._element);
        querySelector('[data-cost]', element).textContent = this._missionData.goldAmount.toFixed();
        element.disabled = !this._task.completed;
    }

    private updateNewButton() {
        if (!this._missionData || !this._task) {
            return;
        }
        const element = querySelector<HTMLButtonElement>('[data-trigger="new"]', this._element);
        querySelector<HTMLSpanElement>('[data-cost]', element).textContent = this.newMissionCost.toFixed();
        element.disabled = this._task.completed || this.missions.game.statistics.statistics.Gold.get() < this.newMissionCost;
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
            this.missions.game.statistics.statistics.Gold.subtract(this.unlockCost);
            this.unlock();
            this.generateRandomMission();
        });
        button.disabled = true;
        this.missions.game.statistics.statistics.Gold.addListener('change', amount => {
            button.disabled = amount < this.unlockCost;
        });

        li.appendChild(label);
        li.appendChild(button);
        return li;
    }

    private tryLoad() {
        const savedMission = this.missions.game.saveObj?.missions?.missions?.[this.missions.slots.length];
        if (!savedMission) {
            return;
        }
        this.unlock();

        const missionData = this.missions.data.missionLists.flatMap(x => x).find(x => savedMission.desc && x.description === savedMission.desc);
        if (missionData) {
            this._missionData = missionData;
            this._task = new Task(this.missions.game, missionData.description);
            this._task.startValue = savedMission.startValue || 0;
            this.tryCompletion();
        } else {
            this.generateRandomMission();
        }

        this.updateSlot();
    }
}
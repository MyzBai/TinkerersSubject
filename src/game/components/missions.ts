import type GConfig from '@src/types/gconfig';
import { highlightHTMLElement, queryHTML } from '@src/utils/helpers';
import { visibilityObserver } from '@src/utils/Observers';
import gameLoop from '../gameLoop';
import { playerStats } from '../player';
import type { Save } from '../saveGame';
import Task from '../Task';

const missionListContainer = queryHTML('.p-game .p-missions ul[data-mission-list]');
let missionsData: GConfig['missions'];
const missionSlots: MissionSlot[] = [];
let updateId: string;

visibilityObserver(missionListContainer, handleUpdateLoop);

export function init(data: GConfig['missions']) {
    if(!data){
        return;
    }
    missionsData = data;
    missionListContainer.replaceChildren();
    missionSlots.splice(0);
    if (!data) {
        return;
    }

    for (const slot of data.slots) {
        if (slot.levelReq > 1) {
            const listener = (level: number) => {
                if (level < slot.levelReq) {
                    return;
                }
                new MissionSlot(slot);
                playerStats.level.removeListener('change', listener);
            }
            playerStats.level.addListener('change', listener);
        } else {
            new MissionSlot(slot);
        }
    }
}

function handleUpdateLoop(visible: boolean) {
    if (visible) {
        missionSlots.forEach(x => {
            x.updateLabel();
            x.tryCompletion();
        });
        updateId = gameLoop.subscribe(() => missionSlots.forEach(x => x.updateLabel()), { intervalMilliseconds: 1000 });
    } else {
        gameLoop.unsubscribe(updateId);
    }
}

export function saveMissions(saveObj: Save) {
    saveObj.missions = {
        list: missionSlots.map((slot, i) => {
            if (!slot.task) {
                return undefined;
            }
            const startValue = slot.task?.startValue;
            const text = slot.task.text;
            return {
                index: i, startValue, text
            }
        })
    }
}

export function loadMissions(saveObj: Save) {
    saveObj.missions?.list.filter(x => x).forEach(x => {
        if (x && missionSlots[x.index]) {
            const { text, startValue } = x;
            const task = new Task(text);
            task.startValue = startValue;
            missionSlots[x.index].task = task;
        }

    })
}
class MissionSlot {

    task: Task | undefined;
    private missionData: Required<GConfig>['missions']['list'][number][number] | undefined;
    private element: HTMLLIElement;
    private completed = false;
    constructor(readonly slot: Required<GConfig>['missions']['slots'][number]) {
        this.element = this.createElement();
        highlightHTMLElement(queryHTML('.p-game .s-menu [data-tab-target="missions"]'), 'click');
        highlightHTMLElement(this.element, 'mouseover');

        playerStats.gold.addListener('change', () => {
            this.setNewButton();
        });
    }

    tryCompletion() {
        if (this.task && this.task.completed) {
            this.updateLabel();
            this.complete();
        }
    }

    private complete() {
        if (!this.task || this.completed) {
            return;
        }
        this.completed = true;

        this.setNewButton();
        this.setClaimButton(true);
    }

    private unlockSlot() {
        missionSlots.push(this);
        this.element.querySelector<HTMLButtonElement>('[data-trigger="buy"]')!.remove();

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
            this.generateRandomMission();
        });

        this.element.appendChild(buttonClaim);
        this.element.appendChild(buttonNew);

        this.generateRandomMission();
    }

    private claim() {
        if (!this.missionData) {
            return;
        }
        playerStats.gold.add(this.missionData.goldAmount);
        this.generateRandomMission();
        this.setClaimButton(false);
    }

    private generateRandomMission() {
        if (!missionsData) {
            return;
        }
        const missionDataArr = missionsData.list.reduce((a, c) => {
            const missionData = c.filter(x => x.levelReq <= playerStats.level.get()).sort((a, b) => b.levelReq - a.levelReq)[0];
            if (missionData) {
                a.push(missionData);
            }
            return a;
        }, []);
        if (missionDataArr.length === 0) {
            throw Error('No missions available');
        }
        const index = Math.floor(Math.random() * missionDataArr.length);
        this.missionData = missionDataArr[index];
        const description = this.missionData.description;
        this.task = new Task(description);

        const id = gameLoop.subscribe(() => {
            if (this.task?.completed) {
                gameLoop.unsubscribe(id);
                this.setClaimButton(true);
            }
        }, { intervalMilliseconds: 1000 });

        this.updateLabel();
        this.setClaimButton(false);
        this.setNewButton();
    }

    updateLabel() {
        if (!this.task) {
            return;
        }
        const label = this.element.querySelector('[data-label]')!;
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
    private setClaimButton(enabled: boolean) {
        if (!this.missionData) {
            return;
        }
        const element = this.element.querySelector<HTMLButtonElement>('[data-trigger="claim"]')!;
        element.querySelector('[data-cost]')!.textContent = this.missionData.goldAmount.toFixed();
        element.disabled = !enabled;
    }

    private setNewButton() {
        if (!this.missionData || !this.task) {
            return;
        }
        const cost = Math.ceil(this.missionData.goldAmount * 0.1);
        const element = this.element.querySelector<HTMLButtonElement>('[data-trigger="new"]')!;
        element.querySelector<HTMLSpanElement>('[data-cost]')!.textContent = cost.toFixed();
        element.disabled = playerStats.gold.get() < cost || this.task!.completed;
    }

    private createElement() {
        const li = document.createElement('li');
        const label = document.createElement('div');
        label.textContent = '[Locked]';
        label.setAttribute('data-label', '');

        const button = document.createElement('button');
        button.classList.add('g-button');
        button.insertAdjacentHTML('beforeend', `<span>Buy</span>`);
        button.insertAdjacentHTML('beforeend', `<span class="g-gold" data-cost>${this.slot.cost}</span>`);
        button.setAttribute('data-trigger', 'buy');
        button.addEventListener('click', () => this.unlockSlot());

        if (this.slot.cost > playerStats.gold.get()) {
            const listener = (amount: number) => {
                if (this.slot.cost > amount) {
                    playerStats.gold.removeListener('change', listener);
                    button.disabled = false;
                }
            }
            playerStats.gold.addListener('change', listener);
        }

        li.appendChild(label);
        li.appendChild(button);
        missionListContainer.appendChild(li);
        return li;
    }
}
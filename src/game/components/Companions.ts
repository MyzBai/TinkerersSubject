import type { CompanionConfig } from "@src/types/gconfig/companions";
import type CompanionsConfig from "@src/types/gconfig/companions";
import type { CompanionSave } from "@src/types/save/companions";
import type GameSave from "@src/types/save/save";
import { Modifier } from "../mods";
import Statistics from "../Statistics";
import Component from "./Component";


export default class Companions extends Component {

    private readonly companions: Companion[] = [];
    private readonly activeCompanionsIndices: number[] = [];
    private readonly dataSlotListContainer: HTMLElement;
    readonly slots: Slot[] = [];
    activeSlot?: Slot;
    private readonly view: View;
    constructor(readonly config: CompanionsConfig) {
        super('companions');
        this.view = new View(this);
        this.dataSlotListContainer = this.page.querySelectorForce('ul[data-slots]');
        const listContainer = this.page.querySelectorForce('ul[data-list]');
        for (const data of config.list) {
            Statistics.statistics.Level.registerCallback(data.levelReq, () => {
                const companion = new Companion(data);
                this.companions.push(companion);
                listContainer.appendChild(companion.element);
                companion.element.addEventListener('click', () => {
                    this.selectListItem(companion);
                });
            });
        }

        this.selectListItem(this.companions[0]);

        this.page.querySelectorForce('[data-add]').addEventListener('click', this.createSlot.bind(this));
        this.page.querySelectorForce('[data-remove]').addEventListener('click', this.removeSlot.bind(this));
    }

    private createSlot() {
        const slot = new Slot();
        this.slots.push(slot);
        this.dataSlotListContainer.appendChild(slot.element);
        slot.element.addEventListener('click', () => this.selectSlot(slot));
        slot.element.click();
    }

    private selectSlot(slot: Slot) {
        this.activeSlot = slot;
        this.slots.forEach(x => x.element.classList.toggle('selected', x === slot));
        this.selectListItem(slot.companion);
    }

    private removeSlot() {
        let selectedSlot = this.activeSlot;
        const lastSlot = this.slots.pop();
        if (selectedSlot === lastSlot) {
            selectedSlot = this.slots[this.slots.length - 1];
        }
        lastSlot?.element.remove();
        this.activeSlot = selectedSlot;
        if (this.activeSlot) {
            this.activeSlot.element.click();
        } else {
            this.companions[0]?.element.click();
        }
    }

    private selectListItem(companion?: Companion) {
        companion = companion || this.companions[0];
        this.companions.forEach(x => x.element.classList.toggle('selected', x === companion));
        this.view.show(companion!);
    }

    save(saveObj: GameSave): void {
        saveObj.companions = {
            list: this.companions.filter((_x, i) => this.activeCompanionsIndices.includes(i)).reduce<CompanionSave[]>((a, c) => {
                a.push({ name: c.config.name });
                return a;
            }, [])
        };
    }
}

class Slot {
    readonly element: HTMLElement;
    private _companion?: Companion;
    constructor() {
        this.element = this.createElement();
    }
    get companion() {
        return this._companion;
    }

    setCompanion(companion?: Companion) {
        this._companion = companion;
        this.element.querySelectorForce('[data-name]').textContent = this._companion ? this._companion.config.name : '[Empty]';;

        if (companion) {

        }
    }

    private startAutoAttack() {
        // const calcWaitTime = () => 1 / this.game.statistics.statistics['Attack Speed'].get();
        // this.game.statistics.statistics['Attack Speed'].addListener('change', () => {
        //     waitTimeSeconds = calcWaitTime();
        //     time = waitTimeSeconds * this._attackProgressPct;
        // });
        // let waitTimeSeconds = calcWaitTime();
        // let time = 0;
        // this.game.gameLoop.subscribe(dt => {
        //     this._attackProgressPct = Math.min(invLerp(0, waitTimeSeconds, time), 1);
        //     time += dt;
        //     if (time >= waitTimeSeconds) {
        //         const curMana = this.game.statistics.statistics['Current Mana'].get();
        //         const manaCost = this.game.statistics.statistics['Attack Mana Cost'].get();
        //         if (curMana > manaCost) {
        //             this.game.statistics.statistics['Current Mana'].subtract(manaCost);
        //             this.performAttack();
        //             waitTimeSeconds = calcWaitTime();
        //             time = 0;
        //         }
        //     }
        // });
    }

    private createElement() {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.insertAdjacentHTML('beforeend', `<div data-name>[Empty]</div`);
        li.insertAdjacentHTML('beforeend', `<progress class="small" value="0" max="1"></progress>`)
        return li;
    }
}

class Companion {
    readonly element: HTMLElement;
    readonly mods: Modifier[];
    constructor(readonly config: CompanionConfig) {
        this.element = this.createElement();
        this.mods = config.mods.map(x => new Modifier(x));
    }

    private createElement() {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', this.config.name);
        li.textContent = this.config.name;
        return li;
    }
}

class View {
    readonly container: HTMLElement;
    private activeCompanion?: Companion;
    constructor(private readonly companions: Companions) {
        this.container = this.companions.page.querySelectorForce('[data-view]');

        this.container.querySelectorForce<HTMLButtonElement>('[data-enable]').addEventListener('click', () => {
            if (!this.activeCompanion) {
                return;
            }
            const remove = this.companions.activeSlot?.companion === this.activeCompanion;
            this.companions.activeSlot?.setCompanion(remove ? undefined : this.activeCompanion);
            this.show(this.activeCompanion);
        });

    }

    show(companion: Companion) {
        this.activeCompanion = companion;
        this.container.querySelectorForce('[data-title]').textContent = companion.config.name;


        //stats
        {
            const table = this.container.querySelectorForce('table');
            table.replaceChildren();
            table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${companion.config.attackSpeed.toFixed(2)}</td></tr>`);
            table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${companion.config.baseDamageMultiplier}%</td></tr>`);
        }

        //mods
        {
            for (const mod of companion.mods) {
                const element = document.createElement('div');
                element.classList.add('g-mod-desc');
                element.textContent = mod.desc;
                this.container.querySelectorForce('[data-mods]').appendChild(element);
            }
        }

        const button = this.container.querySelectorForce<HTMLButtonElement>('[data-enable]');
        button.disabled = !this.companions.activeSlot || this.companions.slots.some(x => x.companion === companion && x.companion !== this.companions.activeSlot?.companion);
        const buttonLabel = this.companions.activeSlot?.companion === companion ? 'Remove' : 'Add';
        button.textContent = buttonLabel;
    }
}
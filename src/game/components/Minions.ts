import { highlightHTMLElement, invLerp } from "@src/utils/helpers";
import { calcAttack } from "../calc/calcDamage";
import Enemy from "../Enemy";
import Game, { Save } from "../Game";
import { ModDB, Modifier, StatModifier, StatModifierFlags } from "../mods";
import Player from "../Player";
import Statistics from "../Statistics";
import Component from "./Component";


export default class Minions extends Component {

    private readonly minions: Minion[] = [];
    private readonly dataSlotListContainer: HTMLElement;
    readonly slots: Slot[] = [];
    activeSlot?: Slot;
    private readonly view: View;
    constructor(readonly config: MinionsConfig) {
        super('minions');
        this.view = new View(this);
        this.dataSlotListContainer = this.page.querySelectorForce('ul[data-slots]');

        for (const data of config.list) {
            const levelReq = Array.isArray(data) ? data[0]!.levelReq : 1;
            Statistics.statistics.Level.registerCallback(levelReq, () => {
                const minion = new Minion(data);
                this.minions.push(minion);
                this.createMinionListItem(minion);
            });
        }

        this.selectListItem(this.minions[0]);

        this.page.querySelectorForce('[data-add-slot]').addEventListener('click', this.createSlot.bind(this));
        this.page.querySelectorForce('[data-remove-slot]').addEventListener('click', this.removeSlot.bind(this));

        Game.visiblityObserver.registerLoop(this.page, visible => {
            if (!visible) {
                return;
            }
            this.slots.forEach(x => {
                if (!x.minion) {
                    return;
                }
                x.updateProgressBar();
            });
        });

        for (const slotData of Game.saveObj?.minions?.minionSlots || []) {
            const slot = this.createSlot();
            const minion = this.minions.find(x => x.name === slotData?.name);
            if (!minion) {
                continue;
            }
            minion.setRankIndex(slotData?.rankIndex || 0);
            slot.setMinion(minion);
        }

        this.selectSlot(this.slots[0]);
    }

    private createMinionListItem(minion: Minion) {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', minion.name || 'unknown');
        li.textContent = minion.name || 'unknown';
        li.addEventListener('click', () => {
            this.selectListItem(minion);
        });
        highlightHTMLElement(this.menuItem, 'click');
        highlightHTMLElement(li, 'mouseover');
        this.page.querySelectorForce('[data-list]').appendChild(li);
        return li;
    }

    private createSlot() {
        const slot = new Slot();
        this.slots.push(slot);
        this.dataSlotListContainer.appendChild(slot.element);
        slot.element.addEventListener('click', () => this.selectSlot(slot));
        slot.element.click();
        return slot;
    }

    private selectSlot(slot?: Slot) {
        if (!slot && this.activeSlot) {
            this.activeSlot.setMinion();
        }
        this.activeSlot = slot;
        this.slots.forEach(x => x.element.classList.toggle('selected', x === slot));

        this.selectListItem(this.activeSlot?.minion);

        this.page.querySelectorForce<HTMLButtonElement>('[data-remove-slot]').disabled = !this.activeSlot;
    }

    private removeSlot() {
        if (!this.activeSlot) {
            return;
        }
        this.activeSlot.element.remove();
        const slotIndex = this.slots.indexOf(this.activeSlot);
        this.slots.splice(slotIndex, 1);
        const newSlot = this.slots[Math.min(slotIndex, this.slots.length - 1)];
        this.selectSlot(newSlot);
    }

    private selectListItem(minion?: Minion) {
        if (minion) {
            this.page.querySelectorAll('[data-list] [data-name]').forEach(x => {
                x.classList.toggle('selected', x.getAttribute('data-name') === minion.ranks[0]!.config.name);
            });
            this.view.show(minion);
        } else {
            const element = this.page.querySelector<HTMLElement>('[data-list] [data-name]:first-child');
            element?.click();
        }
    }

    save(saveObj: Save): void {
        saveObj.minions = {
            minionSlots: this.slots.reduce<MinionSlotSave[]>((a, c) => {
                const minion: MinionSlotSave = { name: c.minion?.name, rankIndex: c.minion?.rankIndex };
                a.push(minion);
                return a;
            }, []),
            minionList: this.minions.reduce<MinionRankSave[]>((a, c) => {
                for (const rank of c.ranks) {
                    if (!rank.unlocked) {
                        break;
                    }
                    a.push({ name: rank.config.name });
                }
                return a;
            }, [])
        };
    }
}

class Slot {
    readonly element: HTMLElement;
    private readonly progressBar: HTMLProgressElement;
    private _minion?: Minion;
    private _attackProgressPct = 0;
    private attackId?: string;
    private modDB = new ModDB();
    constructor() {
        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce('progress');
    }
    get minion() {
        return this._minion;
    }

    setMinion(minion?: Minion) {
        this._minion = minion;
        this.element.querySelectorForce('[data-name]').textContent = this._minion ? this._minion.rank.config.name : '[Empty]';
        this._attackProgressPct = 0;
        Player.modDB.onChange.listen(() => {
            if (this._minion) {
                this.applyModifiers();
            }
        });

        this.applyModifiers();

        Game.gameLoop.unsubscribe(this.attackId);
        this.modDB.clear();
        if (minion) {
            this.applyModifiers();
            this.startAutoAttack();
        }
    }

    updateProgressBar() {
        this.progressBar.value = this._attackProgressPct;
    }

    private startAutoAttack() {
        const calcWaitTime = () => 1 / Statistics.statistics['Attack Speed'].get();
        Statistics.statistics['Attack Speed'].addListener('change', () => {
            waitTimeSeconds = calcWaitTime();
            time = waitTimeSeconds * this._attackProgressPct;
        });
        let waitTimeSeconds = calcWaitTime();
        let time = 0;
        this.attackId = Game.gameLoop.subscribe(dt => {
            if (!this._minion) {
                Game.gameLoop.unsubscribe(this.attackId);
                return;
            }
            this._attackProgressPct = Math.min(invLerp(0, waitTimeSeconds, time), 1);
            time += dt;
            if (time >= waitTimeSeconds) {
                console.log(this.minion?.name, 'attacked');
                this.performAttack();
                waitTimeSeconds = calcWaitTime();
                time = 0;
            }
        });
    }

    private performAttack() {
        const result = calcAttack(this.modDB.modList);
        if (!result) {
            return;
        }

        Enemy.dealDamage(result.totalDamage);
        // Enemy.applyAilments(result.ailments);
    }

    private applyModifiers() {
        this.modDB.clear();
        if (!this._minion) {
            return;
        }

        const minionModsFromPlayer = Player.modDB.modList.filter(x => (x.flags & StatModifierFlags.Minion) === StatModifierFlags.Minion);
        const minionMods = this._minion.rank.mods.flatMap<StatModifier>(x => x.copy().stats);
        const sourceName = `Minion/${this._minion.rank.config.name}`;
        this.modDB.add([new StatModifier({ name: 'BaseDamageMultiplier', value: this._minion.rank.config.baseDamageMultiplier, valueType: 'Base' })], sourceName);
        this.modDB.add([...minionModsFromPlayer, ...minionMods], sourceName);
    }

    private createElement() {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.insertAdjacentHTML('beforeend', `<div data-name>[Empty]</div`);
        li.insertAdjacentHTML('beforeend', `<progress class="small" value="0" max="1"></progress>`);
        return li;
    }
}

interface Rank {
    config: MinionConfig;
    mods: Modifier[];
    unlocked: boolean;
}

class Minion {
    readonly ranks: Rank[] = [];
    private _rankIndex = 0;
    constructor(configs: MinionConfig | MinionConfig[]) {
        configs = Array.isArray(configs) ? configs : [configs];
        for (const config of configs) {
            this.ranks.push({
                config,
                mods: config.mods.map(x => new Modifier(x)),
                unlocked: !!Game.saveObj?.minions?.minionList?.find(x => x?.name === config.name) || config.goldCost === 0
            });
        }
    }
    get rankIndex() {
        return this.ranks.indexOf(this.rank);
    }
    get rank() {
        return this.ranks[this._rankIndex]!;
    }
    get name() {
        return this.ranks[0]!.config.name;
    }

    setRankIndex(rankIndex: number) {
        this._rankIndex = rankIndex;
    }

    getNextRank() {
        return this.ranks[this._rankIndex + 1];
    }
}

class View {
    private activeMinion?: Minion;
    private rankIndex = 0;
    
    readonly container: HTMLElement;
    private readonly decrementRankButton: HTMLButtonElement;
    private readonly incrementRankButton: HTMLButtonElement;
    private readonly addButton: HTMLButtonElement;
    private readonly removeButton: HTMLButtonElement;
    private readonly unlockButton: HTMLButtonElement;
    constructor(private readonly minions: Minions) {
        this.container = this.minions.page.querySelectorForce('[data-view]');
        this.decrementRankButton = this.container.querySelectorForce('[data-decrement]');
        this.incrementRankButton = this.container.querySelectorForce('[data-increment]');

        this.addButton = this.container.querySelectorForce('[data-add]');
        this.removeButton = this.container.querySelectorForce('[data-remove]');
        this.unlockButton = this.container.querySelectorForce('[data-unlock]');


        this.decrementRankButton.addEventListener('click', () => {
            this.show(this.activeMinion!, this.rankIndex - 1);
        });
        this.incrementRankButton.addEventListener('click', () => {
            this.show(this.activeMinion!, this.rankIndex + 1);
        });

        this.addButton.addEventListener('click', () => {
            this.activeMinion!.setRankIndex(this.rankIndex!);
            this.minions.activeSlot?.setMinion(this.activeMinion);
            this.show(this.activeMinion!, this.rankIndex);
        });

        this.removeButton.addEventListener('click', () => {
            this.minions.activeSlot?.setMinion(undefined);
            this.show(this.activeMinion!, this.rankIndex);
        });

        this.container.querySelectorForce<HTMLButtonElement>('[data-unlock]').addEventListener('click', () => {
            const rank = this.activeMinion?.ranks[this.rankIndex!];
            if (rank && this.activeMinion) {
                Statistics.statistics.Gold.subtract(rank.config.goldCost || 0);
                rank.unlocked = true;
                this.show(this.activeMinion, this.rankIndex);
            }
        });

    }

    show(minion: Minion, rankIndex?: number) {
        if (typeof rankIndex === 'number') {
            this.rankIndex = rankIndex;
        } else {
            this.rankIndex = minion.rankIndex;
        }
        this.activeMinion = minion;

        const rank = minion.ranks[this.rankIndex];
        if (!rank) {
            throw RangeError('rank index out of bounds');
        }

        //header
        {
            this.container.querySelectorForce('[data-title]').textContent = rank.config.name;

            this.decrementRankButton.style.visibility = 'hidden';
            this.incrementRankButton.style.visibility = 'hidden';
            if (minion.ranks.length > 1) {
                this.decrementRankButton.style.visibility = 'visible';
                this.incrementRankButton.style.visibility = 'visible';
                this.decrementRankButton.disabled = this.rankIndex <= 0;
                this.incrementRankButton.disabled = !rank.unlocked || this.rankIndex >= minion.ranks.length - 1;
            }
        }

        //stats
        {
            const table = this.container.querySelectorForce('table');
            table.replaceChildren();
            table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${rank.config.attackSpeed.toFixed(2)}</td></tr>`);
            table.insertAdjacentHTML('beforeend', `<tr><td>Base Damage Multiplier</td><td>${rank.config.baseDamageMultiplier}%</td></tr>`);
        }

        //mods
        {
            const container = this.container.querySelectorForce('[data-mods]');
            container.replaceChildren();
            for (const mod of rank.mods) {
                const element = document.createElement('div');
                element.classList.add('g-mod-desc');
                element.textContent = mod.desc;
                container.appendChild(element);
            }
        }

        this.unlockButton.classList.add('hidden');
        this.unlockButton.classList.toggle('hidden', rank.unlocked);
        if (!rank.unlocked) {
            this.unlockButton.disabled = Statistics.statistics.Gold.get() < (rank.config.goldCost || 0);
        }

        if (!this.minions.activeSlot) {
            this.unlockButton.classList.toggle('hidden', rank.unlocked);
            this.removeButton.classList.add('hidden');
            this.addButton.classList.remove('hidden');
            this.addButton.disabled = true;
        } else {
            if (!rank.unlocked) {
                this.unlockButton.classList.remove('hidden');
                this.removeButton.classList.add('hidden');
                this.addButton.classList.remove('hidden');
                this.addButton.disabled = this.minions.slots.some(x => x.minion === minion);
            } else {
                this.unlockButton.classList.add('hidden');
                this.removeButton.classList.add('hidden');
                this.addButton.classList.remove('hidden');
                this.addButton.disabled = this.minions.activeSlot.minion?.rank === rank || this.minions.slots.filter(x => x !== this.minions.activeSlot).some(x => x.minion === minion);
            }
        }
        this.unlockButton.innerHTML = `<span>Unlock <span class="g-gold">${rank.config.goldCost}</span></span>`;
    }
}

//config
export interface MinionsConfig {
    levelReq: number;
    list: (MinionConfig | MinionConfig[])[];
 }

interface MinionConfig{
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    mods: string[];
    goldCost: number;
}

//save
export interface MinionsSave{
    minionSlots: MinionSlotSave[];
    minionList: MinionRankSave[];
}

interface MinionSlotSave{
    name?: string;
    rankIndex?: number;
}

interface MinionRankSave{
    name: string;
}
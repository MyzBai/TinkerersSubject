import { hasAnyFlag, highlightHTMLElement } from "@src/utils/helpers";
import { MinionEntity } from "../Entity";
import Game, { Save } from "../Game";
import { KeywordModifierFlag, Modifier, StatModifier } from "../mods";
import Player from "../Player";
import Statistics, { MinionStatistics, StatisticSave } from "../Statistics";
import Component from "./Component";


export default class Minions extends Component {

    private readonly minions: Minion[] = [];
    private readonly dataSlotListContainer: HTMLElement;
    readonly slots: Slot[] = [];
    activeSlot?: Slot;
    private activeMinion?: Minion;
    private readonly view: View;
    constructor(readonly config: MinionsConfig) {
        super('minions');
        this.view = new View(this);
        this.dataSlotListContainer = this.page.querySelectorForce('ul[data-slots]');

        for (const data of config.list) {
            const levelReq = Array.isArray(data) ? data[0]!.levelReq : 1;
            Statistics.gameStats.Level.registerCallback(levelReq, () => {
                const minion = new Minion(data);
                this.minions.push(minion);
                this.createMinionListItem(minion);
            });
        }

        this.selectListItem(this.minions[0]);

        this.page.querySelectorForce('[data-add-slot]').addEventListener('click', this.createSlot.bind(this));
        this.page.querySelectorForce('[data-remove-slot]').addEventListener('click', this.removeSlot.bind(this));

        Game.visiblityObserver.register(this.page, visible => {
            if (visible) {
                this.updateCounter();
                if(this.activeMinion){
                    this.view.show(this.activeMinion, -1);
                }
            }
        });

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

        Player.onStatsUpdate.listen(() => {
            this.fixStuff();
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
        this.updateCounter();
    }

    get maxActiveMinions() { return Player.stats["Maximum Minions"].get(); }

    updateCounter() {
        const active = this.slots.filter(x => x.minion && x.minion.enabled).length;
        const max = Player.stats["Maximum Minions"].get();
        const text = `${active}/${max}`;
        this.page.querySelectorForce('.s-toolbar [data-count]').textContent = text;
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
        const slot = new Slot(this);
        this.slots.push(slot);
        this.dataSlotListContainer.appendChild(slot.element);
        slot.element.addEventListener('click', () => this.selectSlot(slot));
        slot.element.click();
        this.updateCounter();
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
        this.updateCounter();
    }

    private selectListItem(minion?: Minion) {
        this.activeMinion = minion;
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

    fixStuff() {
        this.minions.forEach(x => x.disable());
        for (const slot of this.slots) {
            const minion = slot.minion;
            if (!minion) {
                continue;
            }
            const count = this.slots.filter(x => x.minion && x.minion.enabled).length;
            if (count < this.maxActiveMinions) {
                minion.enable();
            }
        }
        this.updateCounter();
    }

    save(saveObj: Save): void {
        saveObj.minions = {
            minionSlots: this.slots.reduce<MinionSlotSave[]>((a, c) => {
                const minion: MinionSlotSave = { name: c.minion?.name, rankIndex: c.minion?.rankIndex };
                a.push(minion);
                return a;
            }, []),
            minionList: this.minions.reduce((a, c) => {
                const stats = Statistics.createStatsSaveObj(c.stats);
                const name = c.name;
                const ranks = c.ranks.filter(x => x.unlocked).map(x => x.config.name);
                a.push({ name, ranks, stats })
                return a;
            }, [] as MinionSave[])
        };
    }
}

class Slot {
    readonly element: HTMLElement;
    private readonly progressBar: HTMLProgressElement;
    private _minion?: Minion;
    constructor(private readonly minions: Minions) {
        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce('progress');
    }
    get minion() {
        return this._minion;
    }

    setMinion(minion?: Minion) {
        this._minion = minion;
        this.element.querySelectorForce('[data-name]').textContent = minion ? minion.rank.config.name : '[Empty]';
        this.minions.fixStuff();
    }

    updateProgressBar() {
        if (!this._minion) {
            return;
        }
        const pct = this._minion.attackTime / this._minion.attackWaitTime;
        if (!Number.isNaN(pct)) {
            this.progressBar.value = pct;
        }
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

class Minion extends MinionEntity {
    readonly ranks: Rank[] = [];
    private _rankIndex = 0;
    private _enabled = false;
    constructor(configs: MinionConfig | MinionConfig[]) {
        configs = Array.isArray(configs) ? configs : [configs];
        super(configs[0]!.name);
        const savedMinion = Game.saveObj?.minions?.minionList?.find(x => x?.name === this.name);
        for (const config of configs) {
            this.ranks.push({
                config,
                mods: config.mods.map(x => new Modifier(x)),
                unlocked: !!savedMinion?.ranks?.find(x => x === config.name) || config.goldCost === 0
            });
        }
        this.loadStats(savedMinion?.stats as Record<keyof MinionStatistics['stats'], StatisticSave>);
    }
    get rankIndex() {
        return this.ranks.indexOf(this.rank);
    }
    get rank() {
        return this.ranks[this._rankIndex]!;
    }
    get enabled() { return this._enabled; }

    setRankIndex(rankIndex: number) {
        this._rankIndex = rankIndex;
    }

    getNextRank() {
        return this.ranks[this._rankIndex + 1];
    }

    enable() {
        this.applyModifiers();
        this.beginAutoAttack();
        Game.entityHandler.addEntity(this);
        this._enabled = true;
    }

    disable() {
        if (!this._enabled) {
            return;
        }
        this._enabled = false;
        this._modDB.clear();
        this.stopAttacking();
        Game.entityHandler.removeEntity(this);
    }

    private applyModifiers() {
        this.modDB.clear();
        const minionModsFromPlayer = Player.modDB.modList.filter(x => hasAnyFlag(x.keywords, KeywordModifierFlag.Global, KeywordModifierFlag.Minion));
        const minionMods = this.rank.mods.flatMap<StatModifier>(x => x.copy().stats);
        const sourceName = `Minion/${this.rank.config.name}`;
        this.modDB.add(sourceName, ...[new StatModifier({ name: 'AttackSpeed', value: this.rank.config.attackSpeed, valueType: 'Base' })]);
        this.modDB.add(sourceName, ...[new StatModifier({ name: 'BaseDamageMultiplier', value: this.rank.config.baseDamageMultiplier, valueType: 'Base' })]);
        this.modDB.add(sourceName, ...[...minionModsFromPlayer, ...minionMods]);

        this.updateStats();
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
                Statistics.gameStats.Gold.subtract(rank.config.goldCost || 0);
                rank.unlocked = true;
                this.show(this.activeMinion, this.rankIndex);
            }
        });

        Statistics.gameStats.Gold.addListener('change', x => {
            if (this.minions.page.classList.contains('hidden')) {
                return;
            }
            const rank = this.activeMinion?.ranks[this.rankIndex];
            if (rank && !rank.unlocked) {
                if (rank.config.goldCost <= x) {
                    this.unlockButton.disabled = false;
                }
            }
        });
    }

    show(minion: Minion, rankIndex?: number) {
        if (typeof rankIndex === 'number') {
            this.rankIndex = rankIndex === -1 ? this.rankIndex : rankIndex;
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

        this.addButton.disabled = !this.validateAddButton(minion, rank);
        this.addButton.classList.toggle('hidden', !rank.unlocked);
        if (this.minions.activeSlot?.minion?.rank === rank) {
            this.addButton.classList.add('hidden');
        }

        this.unlockButton.classList.toggle('hidden', rank.unlocked);
        this.unlockButton.disabled = Statistics.gameStats.Gold.get() < (rank.config.goldCost || 0);
        this.unlockButton.innerHTML = `<span>Unlock <span class="g-gold">${rank.config.goldCost}</span></span>`;

        this.removeButton.classList.toggle('hidden', this.minions.activeSlot?.minion?.rank !== rank);
    }

    private validateAddButton(minion: Minion, rank: Minion['rank']) {
        if (!rank.unlocked) {
            return false;
        }
        if (!this.minions.activeSlot) {
            return false;
        }
        if (this.minions.activeSlot.minion?.rank === rank) {
            return false;
        }
        if (this.minions.slots.filter(x => x !== this.minions.activeSlot).some(x => x.minion === minion)) {
            return false;
        }
        return true;
    }
}

//config
export interface MinionsConfig {
    levelReq: number;
    list: (MinionConfig | MinionConfig[])[];
}

interface MinionConfig {
    name: string;
    levelReq: number;
    attackSpeed: number;
    baseDamageMultiplier: number;
    mods: string[];
    goldCost: number;
}

//save
export interface MinionsSave {
    minionSlots: MinionSlotSave[];
    minionList: MinionSave[];
}

interface MinionSlotSave {
    name?: string;
    rankIndex?: number;
}

interface MinionSave {
    name: string;
    stats: Record<keyof MinionStatistics['stats'], StatisticSave>;
    ranks: string[];
}
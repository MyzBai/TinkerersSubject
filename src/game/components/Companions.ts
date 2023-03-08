import type { CompanionConfig } from "@src/types/gconfig/companions";
import type CompanionsConfig from "@src/types/gconfig/companions";
import type { CompanionRankSave, CompanionSlotSave } from "@src/types/save/companions";
import type GameSave from "@src/types/save/save";
import { highlightHTMLElement, invLerp } from "@src/utils/helpers";
import { calcAttack } from "../calc/calcDamage";
import Enemy from "../Enemy";
import Game from "../Game";
import { ModDB, Modifier, StatModifier, StatModifierFlags } from "../mods";
import Player from "../Player";
import Statistics from "../Statistics";
import Component from "./Component";


export default class Companions extends Component {

    private readonly companions: Companion[] = [];
    private readonly dataSlotListContainer: HTMLElement;
    readonly slots: Slot[] = [];
    activeSlot?: Slot;
    private readonly view: View;
    constructor(readonly config: CompanionsConfig) {
        super('companions');
        this.view = new View(this);
        this.dataSlotListContainer = this.page.querySelectorForce('ul[data-slots]');

        for (const data of config.list) {
            const levelReq = Array.isArray(data) ? data[0]!.levelReq : 1;
            Statistics.statistics.Level.registerCallback(levelReq, () => {
                const companion = new Companion(data);
                this.companions.push(companion);
                this.createCompanionListItem(companion);
            });
        }

        this.selectListItem(this.companions[0]);

        this.page.querySelectorForce('[data-add-slot]').addEventListener('click', this.createSlot.bind(this));
        this.page.querySelectorForce('[data-remove-slot]').addEventListener('click', this.removeSlot.bind(this));

        Game.visiblityObserver.register(this.page, visible => {
            if (!visible) {
                return;
            }
            this.slots.forEach(x => {
                if (!x.companion) {
                    return;
                }
                x.updateProgressBar();
            });
        });

        this.selectSlot(this.slots[0]);
    }

    private createCompanionListItem(companion: Companion) {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.setAttribute('data-name', companion.name || 'unknown');
        li.textContent = companion.name || 'unknown';
        li.addEventListener('click', () => {
            this.selectListItem(companion);
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
    }

    private selectSlot(slot?: Slot) {
        this.activeSlot = slot;
        if(slot){
            this.slots.forEach(x => x.element.classList.toggle('selected', x === slot));
            this.selectListItem(slot.companion);
        }

        this.page.querySelectorForce<HTMLButtonElement>('[data-remove-slot]').disabled = !this.activeSlot;
    }

    private removeSlot() {
        let selectedSlot = this.activeSlot;
        const lastSlot = this.slots.pop();
        if (selectedSlot === lastSlot) {
            selectedSlot = this.slots[this.slots.length - 1];
        }
        lastSlot?.element.remove();
        this.selectSlot(undefined);
        if (this.activeSlot) {
            this.activeSlot.element.click();
        } else {
            this.selectListItem(this.companions[0]);
        }
    }

    private selectListItem(companion?: Companion) {
        if (companion) {
            this.page.querySelectorAll('[data-list] [data-name]').forEach(x => {
                x.classList.toggle('selected', x.getAttribute('data-name') === companion.ranks[0]!.config.name)
            });
            this.view.show(companion);
        } else {
            const element = this.page.querySelector<HTMLElement>('[data-list] [data-name]:first-child');
            element?.click();
        }
    }

    save(saveObj: GameSave): void {
        saveObj.companions = {
            companionSlots: this.slots.reduce<CompanionSlotSave[]>((a, c) => {
                if (!c.companion) {
                    return a;
                }
                a.push({ name: c.companion.ranks[0]!.config.name, rankIndex: c.companion.rankIndex })
                return a;
            }, []),
            companionList: this.companions.reduce<CompanionRankSave[]>((a, c) => {
                const ranks = [...c.ranks].slice(1);
                for (const rank of ranks) {
                    if (!rank.unlocked) {
                        break;
                    }
                    a.push({ name: rank.config.name });
                    console.log(rank.config.name);
                }
                return a;
            }, [])
        };
    }
}

class Slot {
    readonly element: HTMLElement;
    private readonly progressBar: HTMLProgressElement;
    private _companion?: Companion;
    private _attackProgressPct = 0;
    private attackId?: string;
    private modDB = new ModDB();
    constructor() {
        this.element = this.createElement();
        this.progressBar = this.element.querySelectorForce('progress');
    }
    get companion() {
        return this._companion;
    }

    setCompanion(companion?: Companion) {
        this._companion = companion;
        this.element.querySelectorForce('[data-name]').textContent = this._companion ? this._companion.rank.config.name : '[Empty]';
        this._attackProgressPct = 0;
        Game.gameLoop.unsubscribe(this.attackId);
        this.modDB.clear();
        if (companion) {
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
            if (!this._companion) {
                Game.gameLoop.unsubscribe(this.attackId);
            }
            this._attackProgressPct = Math.min(invLerp(0, waitTimeSeconds, time), 1);
            time += dt;
            if (time >= waitTimeSeconds) {
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

        Enemy.applyAilments(result.ailments);
    }

    private applyModifiers() {
        if (!this._companion) {
            return;
        }

        const minionModsFromPlayer = Player.modDB.modList.filter(x => (x.flags & StatModifierFlags.Minion) === StatModifierFlags.Minion);
        const minionMods = this._companion.rank.mods.flatMap<StatModifier>(x => x.copy().stats);
        const sourceName = `Companion/${this._companion.rank.config.name}`;
        this.modDB.add([...minionModsFromPlayer, ...minionMods], sourceName);
    }

    private createElement() {
        const li = document.createElement('li');
        li.classList.add('g-list-item');
        li.insertAdjacentHTML('beforeend', `<div data-name>[Empty]</div`);
        li.insertAdjacentHTML('beforeend', `<progress class="small" value="0" max="1"></progress>`)
        return li;
    }
}

interface Rank {
    config: CompanionConfig;
    mods: Modifier[];
    unlocked: boolean;
}

class Companion {
    readonly ranks: Rank[] = [];
    private _rankIndex = 0;
    constructor(configs: CompanionConfig | CompanionConfig[]) {
        configs = Array.isArray(configs) ? configs : [configs];
        for (const config of configs) {
            this.ranks.push({
                config,
                mods: config.mods.map(x => new Modifier(x)),
                unlocked: !!Game.saveObj?.companions?.companionList?.find(x => x?.name === config.name) || (config.goldCost || 0) === 0
            });
        }
    }
    get rankIndex() { return this.ranks.indexOf(this.rank); }
    get rank() { return this.ranks[this._rankIndex]!; }
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
    readonly container: HTMLElement;
    private activeCompanion?: Companion;
    private rankIndex = 0;

    private readonly addButton: HTMLButtonElement;
    private readonly removeButton: HTMLButtonElement;
    private readonly unlockButton: HTMLButtonElement;
    private readonly decrementRankButton: HTMLButtonElement;
    private readonly incrementRankButton: HTMLButtonElement;
    constructor(private readonly companions: Companions) {
        this.container = this.companions.page.querySelectorForce('[data-view]');
        this.decrementRankButton = this.container.querySelectorForce('[data-decrement]');
        this.incrementRankButton = this.container.querySelectorForce('[data-increment]');

        this.addButton = this.container.querySelectorForce('[data-add]');
        this.removeButton = this.container.querySelectorForce('[data-remove]');
        this.unlockButton = this.container.querySelectorForce('[data-unlock]');


        this.decrementRankButton.addEventListener('click', () => {
            this.show(this.activeCompanion!, this.rankIndex! - 1);
        });
        this.incrementRankButton.addEventListener('click', () => {
            this.show(this.activeCompanion!, this.rankIndex! + 1);
        });

        this.addButton.addEventListener('click', () => {
            this.activeCompanion!.setRankIndex(this.rankIndex!);
            this.companions.activeSlot?.setCompanion(this.activeCompanion);
            this.show(this.activeCompanion!, this.rankIndex);
        });

        this.removeButton.addEventListener('click', () => {
            this.companions.activeSlot?.setCompanion(undefined);
            this.show(this.activeCompanion!, this.rankIndex);
        });

        this.container.querySelectorForce<HTMLButtonElement>('[data-unlock]').addEventListener('click', () => {
            const rank = this.activeCompanion?.ranks[this.rankIndex!];
            if (rank && this.activeCompanion) {
                Statistics.statistics.Gold.subtract(rank.config.goldCost || 0);
                rank.unlocked = true;
                this.show(this.activeCompanion, this.rankIndex);
            }
        });

    }

    show(companion: Companion, rankIndex?: number) {
        if (typeof rankIndex === 'number') {
            this.rankIndex = rankIndex;
        } else {
            this.rankIndex = companion.rankIndex;
        }
        this.activeCompanion = companion;

        const rank = companion.ranks[this.rankIndex];
        if (!rank) {
            throw RangeError('rank index out of bounds');
        }

        //header
        {
            this.container.querySelectorForce('[data-title]').textContent = rank.config.name;

            this.decrementRankButton.style.visibility = 'hidden';
            this.incrementRankButton.style.visibility = 'hidden';
            if (companion.ranks.length > 1) {
                this.decrementRankButton.style.visibility = 'visible';
                this.incrementRankButton.style.visibility = 'visible';
                this.decrementRankButton.disabled = this.rankIndex <= 0;
                this.incrementRankButton.disabled = !rank.unlocked || this.rankIndex >= companion.ranks.length - 1;
            }
        }

        //stats
        {
            const table = this.container.querySelectorForce('table');
            table.replaceChildren();
            table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${rank.config.attackSpeed.toFixed(2)}</td></tr>`);
            table.insertAdjacentHTML('beforeend', `<tr><td>Attack Speed</td><td>${rank.config.baseDamageMultiplier}%</td></tr>`);
        }

        //mods
        {
            for (const mod of rank.mods) {
                const element = document.createElement('div');
                element.classList.add('g-mod-desc');
                element.textContent = mod.desc;
                this.container.querySelectorForce('[data-mods]').appendChild(element);
            }
        }

        this.unlockButton.classList.add('hidden');
        this.unlockButton.classList.toggle('hidden', rank.unlocked);
        if (!rank.unlocked) {
            this.unlockButton.disabled = Statistics.statistics.Gold.get() < (rank.config.goldCost || 0);
        }

        if (!this.companions.activeSlot) {
            this.unlockButton.classList.toggle('hidden', rank.unlocked);
            this.removeButton.classList.add('hidden');
            this.addButton.classList.remove('hidden');
            this.addButton.disabled = true;
        } else {
            if (!rank.unlocked) {
                this.unlockButton.classList.remove('hidden');
                this.removeButton.classList.add('hidden');
                this.addButton.classList.remove('hidden');
                this.addButton.disabled = true;
            } else {
                this.unlockButton.classList.add('hidden');
                this.removeButton.classList.add('hidden');
                this.addButton.classList.remove('hidden');
                this.addButton.disabled = this.companions.activeSlot.companion?.rank === rank;
            }
        }
        this.unlockButton.innerHTML = `<span>Unlock <span class="g-gold">${rank.config.goldCost}</span></span>`;
    }
}
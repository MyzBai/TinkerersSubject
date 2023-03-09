import EventEmitter from "@src/utils/EventEmitter";
import { calcAttack } from "./calc/calcDamage";
import { calcMinionStats, calcPlayerStats } from "./calc/calcMod";
import Enemy from "./Enemy";
import Game from "./Game";
import { ModDB } from "./mods";
import { EntityStatistics, MinionStatistics, PlayerStatistics } from "./Statistics";

export default abstract class Entity {
    abstract stats: EntityStatistics['stats'];
    protected _modDB = new ModDB();
    public readonly onStatsUpdate = new EventEmitter<Entity>();
    protected updateId = -1;
    protected _attackTime = 0;
    protected _attackWaitTime = Number.POSITIVE_INFINITY;
    constructor(readonly name: string) {

        this.modDB.onChange.listen(async () => {
            return new Promise((resolve) => {
                clearTimeout(this.updateId);
                this.updateId = window.setTimeout(async () => {
                    this.updateStats();
                    this.onStatsUpdate.invoke(this);
                    resolve();
                }, 1);
            });
        });

    }

    get modDB() { return this._modDB; }
    get attackTime() { return this._attackTime; }
    get attackWaitTime() { return this._attackWaitTime; }

    get canAttack() { return true; }

    protected abstract updateStats(): void;

    private calcWaitTime() {
        const time = 1 / this.stats["Attack Speed"].get();
        if (Number.isNaN(time)) {
            return Number.POSITIVE_INFINITY;
        }
        return time;
    }

    protected beginAutoAttack() {

        this.stats["Attack Speed"].addListener('change', () => {
            this._attackWaitTime = this.calcWaitTime();
        });

        this._attackWaitTime = this.calcWaitTime();
        Game.gameLoop.subscribe(dt => {
            this._attackTime += dt;
            if (this._attackTime >= this._attackWaitTime) {
                const result = this.canAttack;
                if (result) {
                    this.performAttack();
                    this._attackTime = 0;
                }
            }
        });
    }

    protected performAttack() {
        const result = calcAttack(this);
        if (!result) {
            return;
        }

        this.stats.Hits.add(1);
        this.stats["Total Damage"].add(result.totalDamage);
        this.stats["Total Physical Damage"].add(result.totalPhysicalDamage);
        this.stats["Total Elemental Damage"].add(result.totalElementalDamage);
        if (result.crit) {
            this.stats["Critical Hits"].add(1);
        }
        Enemy.dealDamage(result.totalDamage);
    }
}

export class PlayerEntity extends Entity {
    readonly stats = new PlayerStatistics().stats;
    constructor() {
        super('Player');
    }

    get canAttack() {
        return this.stats["Current Mana"].get() >= this.stats["Attack Mana Cost"].get();
    }

    protected performAttack(): void {
        const manaCost = this.stats["Attack Mana Cost"].get();
        this.stats["Current Mana"].subtract(manaCost);
        super.performAttack();
    }

    updateStats(): void {
        calcPlayerStats(this);
    }
}

export class MinionEntity extends Entity {
    readonly stats = new MinionStatistics().stats;
    constructor(name: string) {
        super(name);
    }
    updateStats(): void {
        calcMinionStats(this);
    }
}
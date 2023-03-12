import EventEmitter from "@src/utils/EventEmitter";
import type { AilmentData } from "./Ailments";
import { calcAttack } from "./calc/calcDamage";
import { calcMinionStats, calcPlayerStats } from "./calc/calcMod";
import Enemy from "./Enemy";
import Game from "./Game";
import { ModDB } from "./mods";
import { EntityStatistics, MinionStatistics, PlayerStatistics, Statistic, StatisticSave } from "./Statistics";

export class EntityHandler {
    readonly onEntityChanged = new EventEmitter<Entity>();
    private _entities = new Map<string, Entity>;
    constructor() {

    }

    addEntity(entity: Entity) {
        this._entities.set(entity.name, entity);
        this.onEntityChanged.invoke(entity);
    }

    removeEntity(entity: Entity) {
        this._entities.delete(entity.name);
        this.onEntityChanged.invoke(entity);
    }

    has(name: string) { return this._entities.has(name); }

    query(constr: Function = Entity) {
        return [...this._entities.values()].filter(x => x instanceof constr);
    }
    queryByName(name: string) { return this._entities.get(name); }

    reset() {
        this._entities.clear();
        this.onEntityChanged.removeAllListeners();
    }
}

export default abstract class Entity {
    abstract stats: EntityStatistics['stats'];
    protected _modDB = new ModDB();
    public readonly onStatsUpdate = new EventEmitter<Entity>();
    protected attackId?: string;
    protected _attackTime = 0;
    protected _attackWaitTime = Number.POSITIVE_INFINITY;
    protected ailments: AilmentData[] = [];
    constructor(readonly name: string) {

    }

    get modDB() { return this._modDB; }
    get attackTime() { return this._attackTime; }
    get attackWaitTime() { return this._attackWaitTime; }

    protected abstract canAttack: boolean;
    protected abstract updateStats(): void;

    protected reset() {
        this._modDB.clear();
        this.onStatsUpdate.removeAllListeners();
        Object.values(this.stats).forEach(x => x.reset());
    }

    private calcWaitTime() {
        const time = 1 / this.stats["Attack Speed"].get();
        if (Number.isNaN(time)) {
            return Number.POSITIVE_INFINITY;
        }
        return time;
    }

    loadStats(savedStats?: Record<keyof EntityStatistics['stats'], StatisticSave>) {
        if (savedStats) {
            Object.entries(savedStats).forEach(([key, value]) => {
                const stat = this.stats[key as keyof EntityStatistics['stats']] as Statistic | undefined;
                if (stat) {
                    stat.set(value.value || stat.defaultValue);
                    stat.sticky = value.sticky || false;
                }
            });
        }
    }

    protected beginAutoAttack() {

        this.stats["Attack Speed"].addListener('change', () => {
            this._attackWaitTime = this.calcWaitTime();
        });

        this._attackWaitTime = this.calcWaitTime();
        this.attackId = Game.gameLoop.subscribe(dt => {
            this._attackTime += dt;
            if (this._attackTime >= this._attackWaitTime) {
                if (this.canAttack) {
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

        if (result.ailments.length > 0) {
            for (const ailment of result.ailments) {
                ailment.detachCallback = () => {
                    const index = this.ailments.indexOf(ailment);
                    if (index !== -1) {
                        this.ailments.splice(index, 1);
                    }
                }
            }
            this.ailments.push(...result.ailments);
            Enemy.applyAilments(this, ...result.ailments);
        }
    }

    protected stopAttacking() {
        Game.gameLoop.unsubscribe(this.attackId);
    }
}

export class PlayerEntity extends Entity {
    readonly stats = new PlayerStatistics().stats;
    protected updateId = -1;
    constructor() {
        super('Player');
    }

    get canAttack() {
        return this.stats["Current Mana"].get() >= this.stats["Attack Mana Cost"].get();
    }

    protected init() {
        this.modDB.onChange.listen(async () => {
            return new Promise((resolve) => {
                clearTimeout(this.updateId);
                this.updateId = window.setTimeout(async () => {
                    this.updateStats();
                    resolve();
                }, 1);
            });
        });
    }

    protected performAttack(): void {
        const manaCost = this.stats["Attack Mana Cost"].get();
        this.stats["Current Mana"].subtract(manaCost);
        super.performAttack();
    }

    updateStats(): void {
        calcPlayerStats(this);
        this.onStatsUpdate.invoke(this);
        clearTimeout(this.updateId);
    }
}

export class MinionEntity extends Entity {
    readonly stats = new MinionStatistics().stats;
    constructor(name: string) {
        super(name);
    }
    protected get canAttack() { return true; }
    updateStats(): void {
        calcMinionStats(this);
        this.onStatsUpdate.invoke(this);
    }
}
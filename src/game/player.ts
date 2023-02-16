import Value from '@utils/Value';
import { ModDB, Modifier } from "./mods";
import { calcPlayerStats } from './calc/calcMod';
import { calcAttack } from "./calc/calcDamage";
import { queryHTML } from "@src/utils/helpers";
import type Game from './Game';
import type { Save } from './saveGame';
import { visibilityObserverLoop } from '@src/utils/Observers';

export default class Player {
    private playerStatsContainer = queryHTML('.p-game > .s-stats');
    private manaBar = queryHTML('.p-combat [data-mana-bar]');
    private statsUpdateId = -1;
    readonly modDB = new ModDB();
    readonly stats = {
        level: new Value(1),
        gold: new Value(0),
        goldPerSecond: new Value(0),
        attackSpeed: new Value(0),
        attackManaCost: new Value(0),
        maxMana: new Value(0),
        curMana: new Value(0),
        manaRegen: new Value(0),
        skillDurationMultiplier: new Value(1)
    };
    constructor(readonly game: Game) {
        visibilityObserverLoop(this.manaBar, (visible) => { if (visible) { this.updateManaBar(); } });
    }

    init() {


        this.modDB.clear();
        this.modDB.onChange.listen(() => this.updateStats());

        Object.values(this.stats).forEach(x => x.reset());

        this.stats.level.addListener('change', x => queryHTML('[data-stat="level"]', this.playerStatsContainer).textContent = x.toFixed());
        this.stats.gold.addListener('change', x => queryHTML('[data-stat="gold"]', this.playerStatsContainer).textContent = x.toFixed());
        this.stats.level.set(this.game.saveObj.player?.level || 1);
        this.stats.gold.set(this.game.saveObj.player?.gold || 0);

        if (this.game.config.player) {
            this.game.config.player.modList.forEach(x => {
                this.modDB.add(new Modifier(x).stats, 'Player');
            });
        }

        this.game.enemy.onDeath.listen(() => {
            if (this.stats.level.get() < this.game.enemy.maxIndex) {
                this.stats.level.add(1);
            }
        });

        this.stats.curMana.addListener('change', curMana => {
            const maxMana = this.stats.maxMana.get();
            if (curMana > maxMana) {
                this.stats.curMana.set(maxMana);
            }
        });

        this.game.gameLoop.subscribe(() => {
            const amount = this.stats.goldPerSecond.get();
            this.stats.gold.add(amount);
            this.game.statistics.statistics["Gold Generated"].add(amount);
        }, { intervalMilliseconds: 1000 });

        this.game.gameLoop.subscribe((dt) => {
            const manaRegen = this.stats.manaRegen.get() * dt;
            this.stats.curMana.add(manaRegen);
            this.game.statistics.statistics["Mana Generated"].add(manaRegen);
        });

        this.game.onSave.listen(this.save.bind(this));

        this.startAutoAttack();
    }

    async setup() {
        await this.updateStats();
        this.stats.curMana.set(this.game.saveObj.player?.curMana || this.stats.maxMana.get());
    }

    updateStats() {
        return new Promise((resolve) => {
            clearTimeout(this.statsUpdateId);
            this.statsUpdateId = window.setTimeout(async () => {
                const statsResult = calcPlayerStats(this.modDB.modList);
                this.stats.attackSpeed.set(statsResult.attackSpeed);
                this.stats.goldPerSecond.set(statsResult.goldPerSecond);
                this.stats.maxMana.set(statsResult.maxMana);
                this.stats.manaRegen.set(statsResult.manaRegen);
                this.stats.attackManaCost.set(statsResult.attackManaCost);
                this.stats.skillDurationMultiplier.set(statsResult.skillDurationMultiplier);
                this.playerStatsContainer.querySelectorAll('[data-stat]').forEach(x => {
                    const attr = x.getAttribute('data-stat') as keyof typeof statsResult;
                    const stat = statsResult[attr] as number;
                    if (typeof stat === 'number') {
                        const numDecimals = Number(x.getAttribute('data-digits') || 0);
                        x.textContent = stat.toFixed(numDecimals);
                    }
                });
                resolve(null);
            }, 1);

        });
    }

    private updateManaBar() {
        const pct = this.stats.curMana.get() / this.stats.maxMana.get() * 100;
        this.manaBar.style.width = pct + '%';
    }

    private startAutoAttack() {
        let deltaTotal = 0;
        this.game.gameLoop.subscribe(dt => {
            const attackSpeed = 1 / this.stats.attackSpeed.get();
            deltaTotal += dt;
            if (deltaTotal >= attackSpeed) {
                const curMana = this.stats.curMana.get();
                const manaCost = this.stats.attackManaCost.get();
                if (curMana > manaCost) {
                    this.stats.curMana.subtract(manaCost);
                    this.performAttack();
                    deltaTotal = 0;
                }
            }
        });
    }

    private performAttack() {
        const result = calcAttack(this.modDB.modList);
        if (!result) {
            return;
        }

        this.game.statistics.statistics.Hits.add(1);
        this.game.statistics.statistics["Total Damage"].add(result.totalDamage);
        this.game.statistics.statistics["Total Physical Damage"].add(result.totalPhysicalDamage);
        if (result.crit) {
            this.game.statistics.statistics["Critical Hits"].add(1);
        }

        this.game.enemy.dealDamage(result.totalDamage);
    }

    save(saveObj: Save) {
        saveObj.player = {
            level: this.stats.level.get(),
            gold: this.stats.gold.get(),
            curMana: this.stats.curMana.get()
        };
    }

    // async load(saveObj: Save) {
    //     const playerSave = saveObj.player;
    //     if (!playerSave) {
    //         return;
    //     }
    //     this.stats.level.set(playerSave.level || 1);
    //     this.stats.gold.set(playerSave.gold || 0);
    //     this.stats.curMana.set(playerSave.curMana || 0);

    //     await this.updateStats();
    // }
}
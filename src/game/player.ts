import Value from '@utils/Value';
import { ModDB, Modifier } from "./mods";
import { calcPlayerStats } from './calc/calcMod';
import { calcAttack } from "./calc/calcDamage";
import { queryHTML } from "@src/utils/helpers";
import type Game from './game';

const playerStatsContainer = document.querySelector<HTMLElement>('.p-game > .s-stats')!;
const manaBar = document.querySelector<HTMLElement>('.p-combat [data-mana-bar]')!;
let statsUpdateId: number;

export default class Player {
    modDB = new ModDB();
    stats = Object.freeze({
        level: new Value(1),
        gold: new Value(0),
        goldPerSecond: new Value(0),
        attackSpeed: new Value(0),
        attackManaCost: new Value(0),
        maxMana: new Value(0),
        curMana: new Value(0),
        manaRegen: new Value(0),
        skillDurationMultiplier: new Value(1)
    });
    constructor(readonly game: Game) {
        this.modDB.onChange.listen(() => this.updateStats);

        game.enemy.onDeath.listen(() => {
            if (this.stats.level.get() < game.enemy.maxIndex) {
                this.stats.level.add(1);
            }
        });

        this.stats.level.addListener('change', x => queryHTML('[data-stat="level"]', playerStatsContainer).textContent = x.toFixed());
        this.stats.gold.addListener('change', x => queryHTML('[data-stat="gold"]', playerStatsContainer).textContent = x.toFixed());
        this.stats.level.set(1); //trigger event to update the ui
        this.stats.gold.set(0);

        this.stats.curMana.addListener('change', curMana => {
            const maxMana = this.stats.maxMana.get();
            if (curMana > maxMana) {
                this.stats.curMana.set(maxMana);
            }
            this.updatemanaBar();
        });

        if (game.config.player) {
            game.config.player.modList.forEach(x => {
                this.modDB.add(new Modifier(x).stats, 'Player');
            });
        }

        game.gameLoop.subscribe(() => {
            const amount = this.stats.goldPerSecond.get();
            this.stats.gold.add(amount);
            game.statistics.statistics["Gold Generated"].add(amount);
        }, { intervalMilliseconds: 1000 });

        game.gameLoop.subscribe((dt) => {
            const manaRegen = this.stats.manaRegen.get() * dt;
            this.stats.curMana.add(manaRegen);
            game.statistics.statistics["Mana Generated"].add(manaRegen);
        });

        this.startAutoAttack();
    }

    async setup() {
        await this.updateStats();
        this.stats.curMana.set(this.stats.maxMana.get());
    }

    updateStats() {
        return new Promise((resolve) => {
            clearTimeout(statsUpdateId);
            statsUpdateId = window.setTimeout(async () => {
                const statsResult = calcPlayerStats(this.modDB.modList);
                this.stats.attackSpeed.set(statsResult.attackSpeed);
                this.stats.goldPerSecond.set(statsResult.goldPerSecond);
                this.stats.maxMana.set(statsResult.maxMana);
                this.stats.manaRegen.set(statsResult.manaRegen);
                this.stats.attackManaCost.set(statsResult.attackManaCost);
                this.stats.skillDurationMultiplier.set(statsResult.skillDurationMultiplier);
                playerStatsContainer.querySelectorAll('[data-stat]').forEach(x => {
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

    private updatemanaBar() {
        const pct = this.stats.curMana.get() / this.stats.maxMana.get() * 100;
        manaBar.style.width = pct + '%';
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

    // save(saveObj: Save) {
    //     saveObj.player = {
    //         level: this.stats.level.get(),
    //         gold: this.stats.gold.get(),
    //         curMana: this.stats.curMana.get()
    //     };
    // }

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
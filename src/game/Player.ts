import Value from '@utils/Value';
import { ModDB, Modifier } from "./mods";
import { calcPlayerStats } from './calc/calcMod';
import { calcAttack } from "./calc/calcDamage";
import { invLerp, querySelector } from "@src/utils/helpers";
import type Game from './Game';
import type { Save } from '@src/types/save';

export default class Player {
    private readonly playerStatsContainer = querySelector('.p-game [data-player-stats]');
    private readonly manaBar: HTMLProgressElement;
    private statsUpdateId = -1;
    readonly modDB = new ModDB();
    readonly stats = {
        level: new Value(1),
        gold: new Value(0),
        goldPerSecond: new Value(0),
        attackSpeed: new Value(Number.MAX_VALUE),
        attackManaCost: new Value(0),
        maxMana: new Value(0),
        curMana: new Value(0),
        manaRegen: new Value(0),
        skillDurationMultiplier: new Value(1)
    };
    private _attackProgressPct: number = 0;
    constructor(readonly game: Game) {
        this.manaBar = querySelector<HTMLProgressElement>('[data-mana-bar]', this.game.page);
    }

    get attackProgressPct() {
        return this._attackProgressPct;
    }

    init() {
        this.modDB.clear();
        this.modDB.onChange.listen(() => this.updateStats());

        Object.values(this.stats).forEach(x => x.reset());

        this.stats.level.addListener('change', x => querySelector('[data-stat="level"]', this.playerStatsContainer).textContent = x.toFixed());
        this.stats.gold.addListener('change', x => querySelector('[data-stat="gold"]', this.playerStatsContainer).textContent = x.toFixed());
        this.stats.level.set(this.game.saveObj.player?.level || 1);
        this.stats.gold.set(this.game.saveObj.player?.gold || 0);

        if (this.game.config.player) {
            this.game.config.player.modList.forEach(x => {
                this.modDB.add(new Modifier(x).stats, 'Player');
            });
        }

        this.game.gameLoop.subscribeAnim(() => {
            this.updateManaBar();
        });

        this.game.enemy.onDeath.listen(() => {
            if (this.stats.level.get() <= this.game.enemy.maxIndex) {
                // this.stats.level.set(this.game.enemy.index+1);
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
        this.updateManaBar();
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
        const pct = this.stats.curMana.get() / this.stats.maxMana.get();
        this.manaBar.value = pct;
    }

    private startAutoAttack() {

        const calcWaitTime = () => 1 / this.stats.attackSpeed.get();
        this.stats.attackSpeed.addListener('change', () => {
            waitTimeSeconds = calcWaitTime();
            time = waitTimeSeconds * this._attackProgressPct;
        });
        let waitTimeSeconds = calcWaitTime();
        let time = 0;
        this.game.gameLoop.subscribe(dt => {
            this._attackProgressPct = Math.min(invLerp(0, waitTimeSeconds, time), 1);
            time += dt;
            if (time >= waitTimeSeconds) {
                const curMana = this.stats.curMana.get();
                const manaCost = this.stats.attackManaCost.get();
                if (curMana > manaCost) {
                    this.stats.curMana.subtract(manaCost);
                    this.performAttack();
                    waitTimeSeconds = calcWaitTime();
                    time = 0;
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
}
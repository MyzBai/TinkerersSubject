import { ModDB, Modifier } from "./mods";
import { calcAttack } from "./calc/calcDamage";
import { invLerp, querySelector } from "@src/utils/helpers";
import Game from './Game';
import Statistics from './Statistics';
import type GameSave from "@src/types/save/save";
import Enemy from "./Enemy";

export class Player {
    private readonly manaBar = querySelector<HTMLProgressElement>('.p-game [data-mana-bar]');
    readonly modDB = new ModDB();
    private _attackProgressPct: number = 0;
    constructor() {
    }

    get attackProgressPct() {
        return this._attackProgressPct;
    }

    init() {
        Game.onSave.listen(this.save.bind(this));

        if (Game.config!.player) {
            Game.config!.player.modList.forEach(x => {
                this.modDB.add(new Modifier(x).stats, 'Player');
            });
        }

        Game.gameLoop.subscribeAnim(() => {
            this.updateManaBar();
        });

        Statistics.statistics['Current Mana'].addListener('change', curMana => {
            const maxMana = Statistics.statistics['Maximum Mana'].get();
            if (curMana > maxMana) {
                Statistics.statistics['Current Mana'].set(maxMana);
            }
        });

        Game.gameLoop.subscribe(() => {
            const amount = Statistics.statistics['Gold Generation'].get();
            Statistics.statistics.Gold.add(amount);
            Statistics.statistics["Gold Generated"].add(amount);
        }, { intervalMilliseconds: 1000 });

        Game.gameLoop.subscribe((dt) => {
            const manaRegen = Statistics.statistics['Mana Regeneration'].get() * dt;
            Statistics.statistics['Current Mana'].add(manaRegen);
            Statistics.statistics["Mana Generated"].add(manaRegen);
        });

        this._attackProgressPct = Game.saveObj?.player?.attackTimePct || 0;
    }

    reset() {
        this.modDB.clear();
    }

    async setup() {
        Statistics.statistics['Current Mana'].set(Game.saveObj?.player?.curMana || Statistics.statistics['Maximum Mana'].get());
        this.updateManaBar();

        this.startAutoAttack();
    }

    private updateManaBar() {
        if (Statistics.statistics['Maximum Mana'].get() <= 0) {
            return;
        }
        const pct = Statistics.statistics['Current Mana'].get() / Statistics.statistics['Maximum Mana'].get();
        this.manaBar.value = pct;
    }

    private startAutoAttack() {

        const calcWaitTime = () => 1 / Statistics.statistics['Attack Speed'].get();
        Statistics.statistics['Attack Speed'].addListener('change', () => {
            waitTimeSeconds = calcWaitTime();
            time = waitTimeSeconds * this._attackProgressPct;
        });
        let waitTimeSeconds = calcWaitTime();
        let time = 0;
        Game.gameLoop.subscribe(dt => {
            this._attackProgressPct = Math.min(invLerp(0, waitTimeSeconds, time), 1);
            time += dt;
            if (time >= waitTimeSeconds) {
                const curMana = Statistics.statistics['Current Mana'].get();
                const manaCost = Statistics.statistics['Attack Mana Cost'].get();
                if (curMana > manaCost) {
                    Statistics.statistics['Current Mana'].subtract(manaCost);
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

        Statistics.statistics.Hits.add(1);
        Statistics.statistics["Total Damage"].add(result.totalDamage);
        Statistics.statistics["Total Physical Damage"].add(result.totalPhysicalDamage);
        Statistics.statistics["Total Elemental Damage"].add(result.totalElementalDamage);
        if (result.crit) {
            Statistics.statistics["Critical Hits"].add(1);
        }
        Enemy.dealDamage(result.totalDamage);

        Enemy.applyAilments(result.ailments);
    }

    save(saveObj: GameSave) {
        saveObj.player = {
            level: Statistics.statistics.Level.get(),
            gold: Statistics.statistics.Gold.get(),
            curMana: Statistics.statistics['Current Mana'].get(),
            attackTimePct: this.attackProgressPct
        };
    }
}

export default new Player();
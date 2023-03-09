import { ModDB, Modifier } from "./mods";
import { calcAttack } from "./calc/calcDamage";
import { querySelector } from "@src/utils/helpers";
import Game, { Save } from './Game';
import Statistics from './Statistics';
import Enemy from "./Enemy";


export class Player {
    private readonly manaBar = querySelector<HTMLProgressElement>('.p-game [data-mana-bar]');
    readonly modDB = new ModDB();
    private _attackTime = 0;
    private _attackWaitTime = Number.POSITIVE_INFINITY;
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

        this._attackTime = Game.saveObj?.player?.attackTime || 0;
    }

    get attackTime() { return this._attackTime; }
    get attackWaitTime() { return this._attackWaitTime; }

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
            this._attackWaitTime = calcWaitTime();
        });
        this._attackWaitTime = calcWaitTime();
        Game.gameLoop.subscribe(dt => {
            this._attackTime += dt;
            if (this._attackTime >= this._attackWaitTime) {
                const curMana = Statistics.statistics['Current Mana'].get();
                const manaCost = Statistics.statistics['Attack Mana Cost'].get();
                if (curMana > manaCost) {
                    Statistics.statistics['Current Mana'].subtract(manaCost);
                    this.performAttack();
                    this._attackTime = 0;
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

    save(saveObj: Save) {
        saveObj.player = {
            level: Statistics.statistics.Level.get(),
            gold: Statistics.statistics.Gold.get(),
            curMana: Statistics.statistics['Current Mana'].get(),
            attackTime: this._attackTime
        };
    }
}

export default new Player();


//save
export interface PlayerSave {
    level?: number;
    gold?: number;
    curMana?: number;
    attackTime?: number;
}
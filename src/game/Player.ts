import { Modifier } from "./mods";
import { querySelector } from "@src/utils/helpers";
import Game, { Save } from './Game';
import Statistics, { PlayerStatistics, StatisticSave } from './Statistics';
import { PlayerEntity } from "./Entity";
import { calcPlayerStats } from "./calc/calcMod";


export class Player extends PlayerEntity {
    private readonly manaBar = querySelector<HTMLProgressElement>('.p-game [data-mana-bar]');

    constructor() {
        super();

    }

    init() {
        Game.onSave.listen(this.save.bind(this));

        Statistics.updateStats(this.name, this.stats);

        if (Game.config!.player) {
            Game.config!.player.modList.forEach(x => {
                this.modDB.add('Player', ...new Modifier(x).stats);
            });
        }

        Game.gameLoop.subscribeAnim(() => {
            this.updateManaBar();
        });

        this.stats['Current Mana'].addListener('change', curMana => {
            const maxMana = this.stats['Maximum Mana'].get();
            if (curMana > maxMana) {
                this.stats['Current Mana'].set(maxMana);
            }
        });

        Game.gameLoop.subscribe((dt) => {
            const manaRegen = this.stats['Mana Regeneration'].get() * dt;
            this.stats['Current Mana'].add(manaRegen);
            this.stats["Mana Generated"].add(manaRegen);
        });

        this._attackTime = Game.saveObj?.player?.attackTime || 0;

        calcPlayerStats(this);
    }

    reset() {
        this.modDB.clear();
    }

    async setup() {
        this.updateStats();
        this.stats['Current Mana'].set(Game.saveObj?.player?.curMana || this.stats['Maximum Mana'].get());
        this.updateManaBar();
        this.beginAutoAttack();
    }

    private updateManaBar() {
        if (this.stats['Maximum Mana'].get() <= 0) {
            return;
        }
        const pct = this.stats['Current Mana'].get() / this.stats['Maximum Mana'].get();
        this.manaBar.value = pct;
    }

    save(saveObj: Save) {
        saveObj.player = {
            attackTime: this._attackTime,
            stats: Statistics.createSaveObj(this.stats)
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
    stats: PlayerStatisticsSave;
}

export type PlayerStatisticsSave = Record<keyof PlayerStatistics['stats'], StatisticSave>;
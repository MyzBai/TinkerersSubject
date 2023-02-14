import EventEmitter from "@src/utils/EventEmitter";
import { queryHTML } from "@src/utils/helpers";
import type Game from "./game";
// import type { Save } from "./saveGame";

const healthBar = queryHTML('.p-game .s-enemy [data-health-bar]');

export default class Enemy {
    onDeath = new EventEmitter<Enemy>();
    private _index: number;
    private healthList: number[];
    private _health: number;
    constructor(readonly game: Game) {
        this.healthList = game.config.enemies.enemyList;
        this._index = 0;
        this._health = this.maxHealth;

        this.onDeath.listen(() => {
            this._index++;
        });


    }
    get index() {
        return this._index;
    }
    get maxIndex() {
        return this.healthList.length - 1;
    }
    get maxHealth() {
        return this.healthList[this.index];
    }
    get health() {
        return this._health;
    }
    dealDamage(amount: number) {
        this._health -= amount;

        if (this._health <= 0) {
            this._health = 0;
            this.onDeath.invoke(this);
        }
        this.updateHealthBar();
    }

    // save(saveObj: Save) {
    //     saveObj.enemy = {
    //         index: this.index,
    //         health: this.health,
    //         dummyDamage: 0
    //     }
    // }
    // load(saveObj: Save) {
    //     const savedEnemy = saveObj.enemy;
    //     if (!savedEnemy) {
    //         return;
    //     }
    //     this._index = savedEnemy.index || 0;
    //     this._health = savedEnemy.health;
    //     this.updateHealthBar();
    // }

    private updateHealthBar() {
        const pct = this.health / this.maxHealth * 100;
        healthBar.style.width = `${pct}%`;
    }
}
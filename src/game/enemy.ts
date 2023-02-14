import EventEmitter from "@src/utils/EventEmitter";
import { clamp, queryHTML } from "@src/utils/helpers";
import type Game from "./game";
import type { Save } from "./saveGame";

export default class Enemy {
    readonly onDeath = new EventEmitter<Enemy>();
    private _index: number;
    private healthList: number[] = [];
    private _health = 0;
    private healthBar = queryHTML('.p-game .s-enemy [data-health-bar]');
    constructor(readonly game: Game) {
        this._index = 0;
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
    private set health(v: number) {
        this._health = clamp(v, 0, this.maxHealth);
    }

    init() {
        this.healthList = this.game.config.enemies.enemyList;
        this._index = this.game.saveObj.enemy?.index || 0;
        this.health = this.game.saveObj.enemy?.health || this.maxHealth;
        this.updateHealthBar();

        this.onDeath.listen(() => {
            this._index++;
        });

        this.game.onSave.listen(this.save.bind(this));
    }

    dealDamage(amount: number) {
        this.health -= amount;

        if (this.health === 0) {
            this.onDeath.invoke(this);
        }
        this.updateHealthBar();
    }

    save(saveObj: Save) {
        saveObj.enemy = {
            index: this.index,
            health: this.health,
            dummyDamage: 0
        }
    }
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
        this.healthBar.style.width = `${pct}%`;
    }
}
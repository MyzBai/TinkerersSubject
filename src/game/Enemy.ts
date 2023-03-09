import { clamp, querySelector } from "@src/utils/helpers";
// import { AilmentData, Ailments, AilmentSave } from "./Ailments";
import Game, { Save } from "./Game";
import Statistics from "./Statistics";

class Enemy {
    // private readonly ailments: Ailments;
    private _index: number;
    private healthList: number[] = [];
    private _health = 0;
    private readonly healthBar: HTMLProgressElement;
    constructor() {
        // this.ailments = new Ailments();
        this._index = 0;
        this.healthBar = querySelector<HTMLProgressElement>('[data-health-bar]');
    }
    get index() {
        return this._index;
    }
    get maxIndex() {
        return this.healthList.length - 1;
    }
    get maxHealth() {
        return this.healthList[this.index] || 1;
    }
    get health() {
        return this._health;
    }
    private set health(v: number) {
        this._health = clamp(v, 0, this.maxHealth);
    }

    init() {
        Game.onSave.listen(this.save.bind(this));
        Game.gameLoop.subscribeAnim(() => {
            this.updateHealthBar();
        });

        Statistics.gameStats.Level.addListener('change', level => {
            this._index = clamp(level, 1, this.maxIndex + 1) - 1;
            this.spawn();
        });

        this.healthList = Game.config!.enemies.enemyList;
        this._index = Game.saveObj?.enemy?.index || 0;
    }

    setup() {
        this.spawn();
        this.health = Game.saveObj?.enemy?.health || this.maxHealth;
        this.updateHealthBar();
        // this.ailments.setup();
    }

    setIndex(index: number) {
        this._index = index;
    }

    spawn() {
        this.health = this.maxHealth;
        if (this.index === this.maxIndex + 1) {
            this.healthBar.textContent = 'Dummy (Cannot die)';
        }
        // this.ailments.reset();
    }

    dealDamage(amount: number) {
        if (this.index === this.maxIndex + 1) {
            return;
        }
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this._index++;
            Statistics.gameStats.Level.add(1);
        }
    }

    dealDamageOverTime(damage: number) {
        this.dealDamage(damage);
    }

    // applyAilments(instances: AilmentData[]) {
    //     for (const instance of instances) {
    //         this.ailments.add(instance);
    //     }
    // }

    save(saveObj: Save) {
        saveObj.enemy = {
            index: this.index,
            health: this.health,
            dummyDamage: 0,
            /*ailments: this.ailments.handlers.reduce<AilmentSave[]>((a, c) => {
                a?.push({ type: c.type, instances: c.instances.map(x => ({ time: x.time, damageFac: x.damageFac })) });
                return a;
            }, [])*/

        };
    }

    private updateHealthBar() {
        const pct = this.health / this.maxHealth;
        this.healthBar.value = pct;
    }
}

export default new Enemy();

export interface EnemySave {
    index?: number;
    health?: number;
    dummyDamage?: number;
    // ailments: AilmentSave[];
}


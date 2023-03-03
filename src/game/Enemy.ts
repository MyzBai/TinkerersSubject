import type { Save } from "@src/types/save";
import EventEmitter from "@src/utils/EventEmitter";
import { clamp, querySelector } from "@src/utils/helpers";
import { AilmentData, AilmentInstance, Ailments } from "./Ailments";
import type Game from "./Game";

export default class Enemy {
    readonly onDeath = new EventEmitter<Enemy>();
    private readonly ailments: Ailments;
    private _index: number;
    private healthList: number[] = [];
    private _health = 0;
    private readonly healthBar: HTMLProgressElement;
    constructor(readonly game: Game) {
        this.ailments = new Ailments(this.game);
        this._index = 0;
        this.healthBar = querySelector<HTMLProgressElement>('[data-health-bar]', this.game.page);
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
        this.game.onSave.listen(this.save.bind(this));
        this.game.gameLoop.subscribeAnim(() => {
            this.updateHealthBar();
        });

        this.healthList = this.game.config.enemies.enemyList;
        this._index = this.game.saveObj.enemy?.index || 0;
    }

    setup() {
        this.spawn();
        this.health = this.game.saveObj.enemy?.health || this.maxHealth;
        this.updateHealthBar();
        this.ailments.setup();
    }

    reset() {
        this.onDeath.removeAllListeners();
    }

    setIndex(index: number) {
        this._index = index;
    }

    spawn() {
        this.health = this.maxHealth;
        if (this.index === this.maxIndex + 1) {
            this.healthBar.textContent = 'Dummy (Cannot die)';
        }
        this.ailments.reset();
    }

    dealDamage(amount: number) {
        if (this.index === this.maxIndex + 1) {
            return;
        }
        this.health -= amount;

        if (this.health <= 0) {
            this.health = 0;
            this._index++;
            this.onDeath.invoke(this);
            this.spawn();
        }
    }

    dealDamageOverTime(damage: number) {
        this.dealDamage(damage);
    }

    applyAilments(instances: AilmentData[]) {
        for (const instance of instances) {
            this.ailments.add(instance);
        }
    }

    save(saveObj: Save) {
        saveObj.enemy = {
            index: this.index,
            health: this.health,
            dummyDamage: 0,
            ailments: this.ailments.handlers.map(x =>
            ({
                type: x.type,
                instances: x.instances.map<Pick<AilmentInstance, 'damageFac' | 'time'>>(y =>
                    ({ damageFac: y.damageFac, time: y.time })
                )
            }))
        }
    }

    private updateHealthBar() {
        const pct = this.health / this.maxHealth;
        this.healthBar.value = pct;
    }
}
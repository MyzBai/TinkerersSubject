import type GConfig from "@src/types/gconfig";
import EventEmitter from "@src/utils/EventEmitter";
import { clamp, queryHTML } from "@src/utils/helpers";
import { Save } from "./save";

const healthBar = queryHTML('.p-game .s-enemy [data-health-bar]');

export let enemies: Enemy[];
let activeEnemy: Enemy;
let index: number;
export const onDeath = new EventEmitter<Enemy>();
onDeath.listen(() => {
    activeEnemy = enemies[++index];
    activeEnemy.init();
});

export function init(data: GConfig['enemies']) {
    enemies = [];
    index = 0;

    enemies.push(...data.enemyList.map(health => new Enemy(health)));
    enemies.push(new Dummy());

    activeEnemy = enemies[index];
    activeEnemy.init();
}

export function dealDamage(amount: number) {
    activeEnemy.takeDamage(amount);
}

export function spawnEnemyAt(level: number) {
    index = clamp(level - 1, 0, enemies.length - 1);
    activeEnemy = enemies[index];
    activeEnemy.init();
}

export function saveEnemy(saveObj: Save) {
    saveObj.enemy = {
        index,
        health: activeEnemy.health,
        dummyDamage: (activeEnemy as Dummy)?.damage
    }
}

export function loadEnemy(save: Save) {
    const savedEnemy = save.enemy;
    if(!savedEnemy){
        return;
    }
    index = savedEnemy.index || 0;
    activeEnemy = enemies[index];
    activeEnemy.health = savedEnemy.health;
    if (activeEnemy instanceof Dummy) {
        activeEnemy.damage = savedEnemy.dummyDamage || 0;
    }
    activeEnemy.init();
}

class Enemy {
    health: number;
    constructor(public readonly maxHealth: number) {
        this.health = maxHealth;
    }

    init(){
        this.updateHealthBar();
    }

    takeDamage(amount: number) {
        this.health = clamp(this.health - amount, 0, this.health);
        this.updateHealthBar();
        if (this.health === 0) {
            onDeath.invoke(this);
        }
    }

    updateHealthBar() {
        const pct = this.health / this.maxHealth * 100;
        healthBar.style.width = `${pct}%`;
    }
}

class Dummy extends Enemy {
    damage: number;
    constructor() {
        super(1);
        this.damage = 0;
    }

    init(){
        healthBar.style.width = '100%';
        this.updateHealthBar();
    }

    takeDamage(amount: number) {
        this.damage += amount;
        this.updateHealthBar();
    }

    updateHealthBar() {
        healthBar.setAttribute('data-damage', this.damage.toFixed());
    }
}

export default { init, spawnEnemyAt, dealDamage, onDeath }
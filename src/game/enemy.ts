import type GConfig from "@src/types/gconfig";
import EventEmitter from "@src/utils/EventEmitter";
import { clamp } from "@src/utils/helpers";
import { Save } from "./save";

const healthBar = document.querySelector<HTMLElement>('.p-game .s-enemy [data-health-bar]');

export let enemies: Enemy[];
let activeEnemy: Enemy;
let index: number;
export const onDeath = new EventEmitter<Enemy>();
onDeath.listen(x => {
    activeEnemy = enemies[++index];
    activeEnemy.updateHealthBar();
});

export function init(data: GConfig['enemies']) {
    enemies = [];
    index = 0;

    enemies.push(...data.enemyList.map(health => new Enemy(health)));
    enemies.push(new Dummy());

    activeEnemy = enemies[index];
    activeEnemy.updateHealthBar();
}

export function dealDamage(amount: number) {
    activeEnemy.takeDamage(amount);
}

export function spawnEnemyAt(level: number) {
    index = clamp(level - 1, 0, enemies.length - 1);
}

export function saveEnemy(saveObj: Save) {
    saveObj.enemy = {
        index,
        health: activeEnemy.health,
        dummyDamage: (activeEnemy as Dummy)?.damage
    }
}

export function loadEnemy(saveObj: Save) {
    index = saveObj.enemy.index;
    activeEnemy = enemies[index];
    activeEnemy.health = saveObj.enemy.health;
    if (activeEnemy instanceof Dummy) {
        activeEnemy.damage = saveObj.enemy.dummyDamage || 0;
    }
    activeEnemy.updateHealthBar();
}

class Enemy {
    health: number;
    constructor(public readonly maxHealth: number) {
        this.health = maxHealth;
    }

    takeDamage(amount: number) {
        this.health = clamp(this.health - amount, 0, this.health);
        if (this.health === 0) {
            this.health = 0;
            onDeath.invoke(this);
        }
        this.updateHealthBar();
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

    takeDamage(amount: number): void {
        this.damage += amount;
        this.updateHealthBar();
    }

    updateHealthBar(): void {
        healthBar.setAttribute('data-damage', this.damage.toFixed());
    }
}

export default { init, spawnEnemyAt, dealDamage, onDeath }
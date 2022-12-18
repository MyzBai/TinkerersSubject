import Value from "@utils/Value";
import type GConfig from "@src/types/gconfig";
import { clamp } from "@src/utils/helpers";

const healthBar = document.querySelector<HTMLElement>('.p-combat [data-health-bar]');

export const enemyStats = Object.freeze({
    maxHealth: new Value<number>(0),
    curHealth: new Value<number>(0),
    index: new Value<number>(0),
    maxIndex: new Value<number>(0)
});

enemyStats.curHealth.onChange.listen(updateHealthBar);

let enemyList: GConfig['enemies']['enemyList'];
export function init(enemyData: GConfig['enemies']) {
    enemyList = enemyData.enemyList;
    enemyStats.index.set(0);
    enemyStats.maxIndex.set(enemyList.length-1)
}

export function spawn(level: number) {
    const targetIndex = level - 1;
    const maxIndex = enemyStats.maxIndex.get();
    enemyStats.index.set(clamp(targetIndex, 0, maxIndex));
    const health = enemyList[enemyStats.index.get()];
    enemyStats.maxHealth.set(health);
    enemyStats.curHealth.set(health);
    updateHealthBar();
}

export function takeDamage(amount: number) {
    enemyStats.curHealth.subtract(amount);
}

function updateHealthBar() {
    const pct = enemyStats.curHealth.get() / enemyStats.maxHealth.get() * 100;
    healthBar.style.width = pct + '%';
}

export default { enemyStats, spawn, takeDamage }
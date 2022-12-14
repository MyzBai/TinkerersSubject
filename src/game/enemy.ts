import Value from "@utils/Value";
import type GConfig from "@src/types/gconfig";
import EventEmitter from "@utils/EventEmitter";

const healthBar = document.querySelector<HTMLElement>('.p-combat [data-health-bar]');


const maxHealth = new Value<number>(0);
const curHealth = new Value<number>(0);
let index = 0;

export const onDeath = new EventEmitter<number>();
export const getListIndex = () => index;

export function init(enemyData: GConfig['enemies']) {

    curHealth.onChange.removeAllListeners();
    curHealth.onChange.listen(x => {
        if (x <= 0) {
            index = Math.min(index + 1, enemyData.enemyList.length - 1);
            onDeath.invoke(index);
            maxHealth.set(enemyData.enemyList[index]);
            curHealth.set(maxHealth.get());
        }
        updatehealthBar();
    });

    index = 0;
    maxHealth.set(enemyData.enemyList[index]);
    curHealth.set(maxHealth.get());
}

export function takeDamage(amount: number) {
    curHealth.subtract(amount);
}

function updatehealthBar() {
    const pct = curHealth.get() / maxHealth.get() * 100;
    healthBar.style.width = pct + '%';
}
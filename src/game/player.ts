import type { Player } from "@src/types/gconfig";
import Value from '@utils/Value';
import { ModDB, Modifier } from "./mods";
import { calcPlayerStats } from './calc/calcMod';
import { calcAttack } from "./calc/calcDamage";
import { gameLoop } from "./game";
import { onDeath, takeDamage as dealDamageToEnemy } from './enemy';
import statistics from "./statistics";
import type { Save } from "./save";

const playerStatsContainer = document.querySelector('.p-game > .s-stats');
const manaBar = document.querySelector<HTMLElement>('.p-combat [data-mana-bar]');
let statsUpdateId: number;

export const modDB = new ModDB();
modDB.onChange.listen(updateStats);

export const playerStats = Object.freeze({
    level: new Value<number>(1),
    gold: new Value<number>(0),
    goldPerSecond: new Value<number>(0),
    attackSpeed: new Value<number>(0),
    attackManaCost: new Value<number>(0),
    maxMana: new Value<number>(0),
    curMana: new Value<number>(0),
    manaRegen: new Value<number>(0),
    skillDurationMultiplier: new Value<number>(1)
});

onDeath.listen(index => {
    const newLevel = index + 1;
    if (newLevel !== playerStats.level.get()) {
        playerStats.level.set(newLevel);
    }
})

export function init(data?: Player) {

    Object.values(playerStats).forEach(x => x.reset());
    playerStats.level.onChange.listen(x => playerStatsContainer.querySelector('[data-stat="level"]')!.textContent = x.toString());
    playerStats.gold.onChange.listen(x => playerStatsContainer.querySelector('[data-stat="gold"]')!.textContent = x.toString());
    playerStats.curMana.onChange.listen(() => {
        const maxMana = playerStats.maxMana.get();
        if (playerStats.curMana.get() > maxMana) {
            playerStats.curMana.set(maxMana);
        }
        updatemanaBar();
    });

    if (data) {
        data.modList.forEach(x => {
            modDB.add(new Modifier(x).stats, 'Player');
        });
    }

    gameLoop.subscribe(() => {
        const amount = playerStats.goldPerSecond.get();
        playerStats.gold.add(amount);
        statistics["Gold Generated"].add(amount);
    }, { intervalMilliseconds: 1000 });

    gameLoop.subscribe((dt) => {
        const manaRegen = playerStats.manaRegen.get() * dt;
        playerStats.curMana.add(manaRegen);
        statistics["Mana Generated"].add(manaRegen);
    });

    startAutoAttack();
}

export async function setup() {
    await updateStats();
    playerStats.curMana.set(playerStats.maxMana.get());
}

async function updateStats() {
    return new Promise((resolve) => {
        clearTimeout(statsUpdateId);
        statsUpdateId = setTimeout(async () => {
            const statsResult = calcPlayerStats(modDB.modList);
            playerStats.attackSpeed.set(statsResult.attackSpeed);
            playerStats.goldPerSecond.set(statsResult.goldPerSecond);
            playerStats.maxMana.set(statsResult.maxMana);
            playerStats.manaRegen.set(statsResult.manaRegen);
            playerStats.attackManaCost.set(statsResult.attackManaCost);
            playerStats.skillDurationMultiplier.set(statsResult.skillDurationMultiplier);
            playerStatsContainer.querySelector('[data-stat="dps"]')!.textContent = statsResult.dps.toFixed();
            playerStatsContainer.querySelectorAll('[data-stat]').forEach(x => {
                const attr = x.getAttribute('data-stat')! as keyof typeof statsResult;
                const stat = statsResult[attr] as number;
                if (typeof stat === 'number') {
                    const numDecimals = Number(x.getAttribute('data-digits') || 0);
                    x.textContent = stat.toFixed(numDecimals);
                }
            });
            resolve(null);
        }, 1);

    });
}

function updatemanaBar() {
    const pct = playerStats.curMana.get() / playerStats.maxMana.get() * 100;
    manaBar.style.width = pct + '%';
}

function startAutoAttack() {
    let deltaTotal = 0;

    gameLoop.subscribe(dt => {
        const attackSpeed = playerStats.attackSpeed.get();
        if (typeof attackSpeed !== 'number') {
            throw Error();
        }

        deltaTotal += dt * attackSpeed;
        if (deltaTotal >= 1) {
            const curMana = playerStats.curMana.get();
            const manaCost = playerStats.attackManaCost.get();
            if (curMana > manaCost) {
                deltaTotal -= 1;
                playerStats.curMana.subtract(manaCost);
                performAttack();
            }
        }
    });
}


function performAttack() {
    const result = calcAttack(modDB.modList);
    if (!result.hit) {
        return;
    }
    statistics.Hits.add(1);
    statistics["Total Damage"].add(result.totalDamage);
    statistics["Total Physical Damage"].add(result.totalDamage);
    if (result.crit) {
        statistics["Critical Hits"].add(1);
    }
    dealDamageToEnemy(result.totalDamage);
}

export function savePlayer(saveObj: Save) {
    saveObj.player = {
        level: playerStats.level.get(),
        gold: playerStats.gold.get(),
        curMana: playerStats.curMana.get()
    }
}

export function loadPlayer(saveObj: Save) {
    playerStats.level.set(saveObj.player.level);
    playerStats.gold.set(saveObj.player.gold);
    playerStats.curMana.set(saveObj.player.curMana);
    setup();
}
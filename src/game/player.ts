import type { Player } from "@src/types/gconfig";
import Value from '@utils/Value';
import { ModDB, Modifier } from "./mods";
import { calcPlayerStats } from './calc/calcMod';
import { calcAttack } from "./calc/calcDamage";
import { gameLoop } from "./game";
import enemy, { enemies } from "./enemy";
import statistics from "./statistics";
import type { Save } from "./save";
import { queryHTML } from "@src/utils/helpers";

const playerStatsContainer = document.querySelector<HTMLElement>('.p-game > .s-stats')!;
const manaBar = document.querySelector<HTMLElement>('.p-combat [data-mana-bar]')!;
let statsUpdateId: number;

export const modDB = new ModDB();
modDB.onChange.listen(updateStats);

enemy.onDeath.listen(() => {
    if (playerStats.level.get() < enemies.length - 1) {
        playerStats.level.add(1);
    }
});

export const playerStats = Object.freeze({
    level: new Value(1),
    gold: new Value(0),
    goldPerSecond: new Value(0),
    attackSpeed: new Value(0),
    attackManaCost: new Value(0),
    maxMana: new Value(0),
    curMana: new Value(0),
    manaRegen: new Value(0),
    skillDurationMultiplier: new Value(1)
});

export function init(playerData?: Player) {
    modDB.clear();
    Object.values(playerStats).forEach(x => x.reset());
    playerStats.level.addListener('change', x => queryHTML('[data-stat="level"]', playerStatsContainer).textContent = x.toFixed());
    playerStats.gold.addListener('change', x => queryHTML('[data-stat="gold"]', playerStatsContainer).textContent = x.toFixed());

    playerStats.curMana.addListener('change', curMana => {
        const maxMana = playerStats.maxMana.get();
        if (curMana > maxMana) {
            playerStats.curMana.set(maxMana);
        }
        updatemanaBar();
    });

    if (playerData) {
        playerData.modList.forEach(x => {
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
        const attackSpeed = 1 / playerStats.attackSpeed.get();
        deltaTotal += dt;
        if (deltaTotal >= attackSpeed) {
            const curMana = playerStats.curMana.get();
            const manaCost = playerStats.attackManaCost.get();
            if (curMana > manaCost) {
                playerStats.curMana.subtract(manaCost);
                performAttack();
                deltaTotal = 0;
            }
        }
    });
}

function performAttack() {
    const result = calcAttack(modDB.modList);
    if (!result) {
        return;
    }

    statistics.Hits.add(1);
    statistics["Total Damage"].add(result.totalDamage);
    statistics["Total Physical Damage"].add(result.totalPhysicalDamage);
    if (result.crit) {
        statistics["Critical Hits"].add(1);
    }

    enemy.dealDamage(result.totalDamage);
}

export function savePlayer(saveObj: Save) {
    saveObj.player = {
        level: playerStats.level.get(),
        gold: playerStats.gold.get(),
        curMana: playerStats.curMana.get()
    };
}

export async function loadPlayer(saveObj: Save) {
    const playerSave = saveObj.player;
    if(!playerSave){
        return;
    }
    playerStats.level.set(playerSave.level || 1);
    playerStats.gold.set(playerSave.gold || 0);
    playerStats.curMana.set(playerSave.curMana || 0);

    await updateStats();
}
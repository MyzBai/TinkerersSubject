import { registerTabs, tabCallback, queryHTML, isLocalHost } from "@utils/helpers";
import { init as initPlayer, setup as setupPlayer, playerStats } from './player';
import { init as initEnemy } from './enemy';
import { init as initSkills } from './skills/skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import statistics, { createStatisticsElements } from "./statistics";
import { initComponents } from './components/loader';
import { saveGame, loadGame, Save } from "./saveGame";
import saveManager from "@src/utils/saveManager";


const gamePage = queryHTML('.p-game');
registerTabs(queryHTML(':scope > menu', gamePage), queryHTML('.s-middle', gamePage), tabCallback);

queryHTML('.p-settings [data-reset]', gamePage).addEventListener('click', () => {
    if (cachedConfig) {
        if (confirm('You will lose all progress, are you sure?')) {
            resetGame();
        }
    }
});

export const gameLoop: Loop = new Loop();

let cachedConfig = undefined as GConfig | undefined;

export async function init(config: GConfig) {
    cachedConfig = config;

    queryHTML('[data-tab-target="combat"]', gamePage).click();
    gameLoop.reset();

    initEnemy(config.enemies);
    initPlayer(config.player);
    initSkills(config.skills);

    initComponents(config);

    Object.values(statistics).forEach(x => x.reset());

    gameLoop.subscribe(() => {
        statistics["Time Played"].add(1);
    }, { intervalMilliseconds: 1000 });

    gameLoop.subscribe(() => {
        saveGame(config.meta);
    }, { intervalMilliseconds: 1000 * 60 })

    await setupPlayer();

    createStatisticsElements();

    if (!isLocalHost) {
        gameLoop.start();
    } else {
        setupDevHelpers();
    }
}

async function resetGame() {
    if (!cachedConfig) {
        return;
    }
    const save = await saveManager.load<Save>('Game');
    if (!save) {
        return;
    }
    await init(cachedConfig);
    document.querySelectorAll('[data-highlight-notification]').forEach(x => x.removeAttribute('data-highlight-notification'));
}

function setupDevHelpers() {
    if ('TS' in window) {
        return;
    }
    Object.defineProperty(window, 'TS', {
        value: {
            setLevel: (v: number) => playerStats.level.set(v),
            setGold: (v: number) => playerStats.gold.set(v),
            save: () => { if (cachedConfig) { saveGame(cachedConfig.meta); } },
            load: () => { if (cachedConfig) { loadGame(cachedConfig); } },
        }
    });

    console.log('Press Space to toggle GameLoop');
    document.addEventListener('keydown', x => {
        if (x.code === 'Space') {
            if (gameLoop.running) {
                document.title = `Tinkerers Subject (Stopped)`;
                gameLoop.stop();
            } else {
                gameLoop.start();
                document.title = 'Tinkerers Subject (Running)';
            }
        }
    });
}
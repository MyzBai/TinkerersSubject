import { registerTabs, tabCallback, queryHTML, isLocalHost } from "@utils/helpers";
import { init as initPlayer, setup as setupPlayer, playerStats } from './player';
import { init as initEnemy } from './enemy';
import { init as initSkills } from './skills/skills';
import type GConfig from "@src/types/gconfig";
import gameLoop from "@src/game/gameLoop";
import statistics, { createStatisticsElements } from "./statistics";
import { initComponents } from './components/componentLoader';
import { saveGame, loadGame, deleteSave } from "./saveGame";
import './Task';

const gamePage = queryHTML('.p-game');
registerTabs(queryHTML(':scope > menu', gamePage), queryHTML('.s-middle', gamePage), tabCallback);

queryHTML('.p-settings [data-delete-save]', gamePage).addEventListener('click', async () => {
    if (!cachedConfig) {
        return;
    }
    if (confirm('Your save will be permanently deleted! Are you sure? (This will reload the page)')) {
        await deleteSave(cachedConfig.meta.id);
        location.reload();
    }
});

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


function setupDevHelpers() {
    if ('TS' in window) {
        return;
    }
    Object.defineProperty(window, 'TS', {
        value: {
            setLevel: (v: number) => playerStats.level.set(v),
            setGold: (v: number) => playerStats.gold.set(v),
            save: () => { if (cachedConfig) { saveGame(cachedConfig.meta); } },
            load: () => { if (cachedConfig) { loadGame(cachedConfig); } }
        }
    });

    console.log('%cPress G to toggle GameLoop', 'color: orange;background-color:black;padding:3px;');
    document.addEventListener('keydown', x => {
        console.log(x.code);
        if (x.code === 'KeyG') {
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
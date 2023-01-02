import { registerTabs, tabCallback, queryHTML, isLocalHost } from "@utils/helpers";
import { init as initPlayer, setup as setupPlayer, playerStats } from './player';
import { init as initEnemy } from './enemy';
import { init as initSkills } from './skills/skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import statistics, { createStatisticsElements } from "./statistics";
import { initComponents } from './components/loader';
import { saveGame, loadGame } from "./saveGame";


const gamePage = queryHTML('.p-game');
registerTabs(queryHTML(':scope > menu', gamePage), queryHTML('.s-middle', gamePage), tabCallback);


export const gameLoop: Loop = new Loop();

let cachedConfig = undefined as GConfig | undefined;

export async function init(config: GConfig) {
    cachedConfig = config;

    gameLoop.reset();

    initEnemy(config.enemies);
    initPlayer(config.player);
    initSkills(config.skills);

    initComponents(config);

    gameLoop.subscribe(() => {
        statistics["Time Played"].add(1);
    }, { intervalMilliseconds: 1000 });

    gameLoop.subscribe(() => {
        saveGame(config.meta);
    }, { intervalMilliseconds: 1000 * 60})

    await setupPlayer();

    createStatisticsElements();


    if (!isLocalHost) {
        gameLoop.start();
    } else {
        setupDevHelpers();
    }
    await loadGame(config);
}


function setupDevHelpers() {
    if('TS' in window){
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
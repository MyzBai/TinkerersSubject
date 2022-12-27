import { registerTabs, tabCallback, isLocalHost, queryHTML } from "@utils/helpers";
import { init as initPlayer, setup as setupPlayer, playerStats } from './player';
import { init as initEnemy } from './enemy';
import { init as initSkills } from './skills/skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import statistics, { createStatisticsElements } from "./statistics";
import loadComponents from './components/loader';
import { saveGame, loadGame } from './save';

const gamePage = queryHTML('.p-game');
registerTabs(queryHTML(':scope > menu', gamePage), queryHTML('.s-middle', gamePage), tabCallback);


if (isLocalHost) {
    Object.defineProperty(window, 'dev', {
        value: {
            setLevel: (v: number) => playerStats.level.set(v),
            setGold: (v: number) => playerStats.level.set(v),
            save: () => saveGame(),
            load: () => loadGame(),
        }
    });

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
    })
}

export const gameLoop: Loop = new Loop();

export async function init(module: GConfig) {

export async function init(config: GConfig) {
    gameLoop.reset();

    initEnemy(config.enemies);
    initPlayer(config.player);
    initSkills(config.skills);

    loadComponents(config);

    gameLoop.subscribe(() => {
        statistics["Time Played"].add(1);
    }, { intervalMilliseconds: 1000 })

    await setupPlayer();

    createStatisticsElements();

    if (!isLocalHost) {
        gameLoop.start();

        gameLoop.subscribe(async () => {
            saveGame();
        }, { intervalMilliseconds: 60000 });

        // await loadGame(config.meta.);
    }


    gamePage.classList.remove('hidden');
}
import { initTabs } from "@utils/helpers";
import { init as initPlayer, setup as setupPlayer, playerStats } from './player';
import { init as initEnemy } from './enemy';
import { init as initSkills } from './skills';
import GConfig from "@public/gconfig/schema";
import Loop from "@utils/Loop";
import statistics, { createStatisticsElements } from "./statistics";
import loadComponents from './components/loader';

initTabs(document.querySelector('.p-game > menu'), document.querySelector('.p-game'));

globalThis.dev = {
    game: {
        playerStats
    }
}

export const gameLoop: Loop = new Loop();
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    document.addEventListener('keydown', x => {
        if (x.code === 'Space') {
            if (gameLoop.running) {
                document.title = 'ModSeeker (Stopped)';
                gameLoop.stop();
            } else {
                gameLoop.start();
                document.title = 'ModSeeker (Running)';
            }
        }
    });
}
export async function init(module: GConfig) {

    gameLoop.reset();

    initEnemy(module.enemies);
    initPlayer(module.player);

    initSkills(module.skills);

    loadComponents({
        items: module.items,
        achievements: module.achievements,
    });

    gameLoop.subscribe(dt => {
        statistics["Time Played"].add(1);
    }, { intervalMilliseconds: 1000 })

    await setupPlayer();


    createStatisticsElements();
}
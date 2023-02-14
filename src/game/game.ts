import { registerTabs, tabCallback, queryHTML, isLocalHost } from "@utils/helpers";
import Player from './player';
import Enemy from './enemy';
import Skills from './skills/skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import Statistics from "./statistics";

const gamePage = queryHTML('.p-game');
registerTabs(queryHTML(':scope > menu', gamePage), queryHTML('.s-middle', gamePage), tabCallback);

export default class Game {
    gameLoop: Loop = new Loop();
    enemy: Enemy;
    player: Player;
    skills: Skills;
    statistics: Statistics;

    constructor(readonly config: GConfig) {
        this.enemy = new Enemy(this);
        this.player = new Player(this);
        this.skills = new Skills(this);

        this.statistics = new Statistics(this);
        this.gameLoop.subscribe(() => {
            this.statistics.statistics["Time Played"].add(1);
        }, { intervalMilliseconds: 1000 });

        // this.gameLoop.subscribe(() => {
        //     saveGame(config.meta);
        // }, { intervalMilliseconds: 1000 * 60 });

        if (isLocalHost) {
            this.setupDevHelpers();
        }
    }
    async setup() {
        this.player.setup();

        if (!isLocalHost) {
            this.gameLoop.start();
        }
        document.querySelectorAll('[data-highlight-notification]').forEach(x => x.removeAttribute('data-highlight-notification'));
    }


    private setupDevHelpers() {
        if ('TS' in window) {
            return;
        }
        Object.defineProperty(window, 'TS', {
            value: {
                setLevel: (v: number) => this.player.stats.level.set(v),
                setGold: (v: number) => this.player.stats.gold.set(v),
            }
        });

        console.log('Press Space to toggle GameLoop');
        document.addEventListener('keydown', x => {
            if (x.code === 'Space') {
                if (this.gameLoop.running) {
                    document.title = `Tinkerers Subject (Stopped)`;
                    this.gameLoop.stop();
                } else {
                    this.gameLoop.start();
                    document.title = 'Tinkerers Subject (Running)';
                }
            }
        });
    }
}


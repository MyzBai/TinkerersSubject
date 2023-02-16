import { registerTabs, queryHTML, isLocalHost } from "@utils/helpers";
import Player from './Player';
import Enemy from './Enemy';
import Skills from './skills/Skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import Statistics from "./Statistics";
import type { Save } from "./saveGame";
import EventEmitter from "@src/utils/EventEmitter";
import { game } from "@src/home/home";
import Items from "./components/items/Items";
import type Component from "./Component";
import Passives from "./components/Passives";
import Achievements from "./components/Achievements";
import Missions from "./components/Missions";
import type { ComponentName } from "@src/types/gconfig";
import type { GameElement } from "@src/webComponents/GameElement";


type Entries<T> = {
    [K in keyof T]: [K, T[K]];
}[keyof T][];
type ComponentsEntries = Entries<Required<GConfig>['components']>;

export default class Game {
    readonly gamePage = queryHTML('.p-game');
    readonly gameLoop = new Loop();
    readonly enemy: Enemy;
    readonly player: Player;
    readonly skills: Skills;
    readonly statistics: Statistics;
    readonly components: Component[] = [];
    readonly onSave = new EventEmitter<Save>();
    private _config: GConfig | undefined;
    private _saveObj: Save | undefined;
    constructor() {
        this.enemy = new Enemy(this);
        this.player = new Player(this);
        this.skills = new Skills(this);

        this.statistics = new Statistics(this);

        if (isLocalHost) {
            this.setupDevHelpers();
        }

        registerTabs(queryHTML('[data-main-menu]', this.gamePage), queryHTML('[data-main-view]', this.gamePage));
    }
    get config() {
        return this._config!;
    }
    get saveObj() {
        return this._saveObj!;
    }

    async init(config: GConfig, saveObj: Save) {
        this._config = config;
        this._saveObj = saveObj;

        this.onSave.removeAllListeners();
        this.gameLoop.reset();

        this.enemy.init();
        this.player.init();
        this.skills.init();
        this.statistics.init();

        this.disposeComponents();
        this.createComponents();

        this.gameLoop.subscribe(() => {
            this.statistics.statistics["Time Played"].add(1);
        }, { intervalMilliseconds: 1000 });

        // this.gameLoop.subscribe(() => {
        //     saveGame(config.meta);
        // }, { intervalMilliseconds: 1000 * 60 });

        await this.setup();
    }
    async setup() {
        this.player.setup();

        if (!isLocalHost) {
            // this.gameLoop.start();
        }
        queryHTML('[data-tab-target="combat"]', this.gamePage).click();
        document.querySelectorAll('[data-highlight-notification]').forEach(x => x.removeAttribute('data-highlight-notification'));
    }


    private disposeComponents() {
        for (const component of this.components) {
            component.dispose();
        }
        this.components.splice(0);
    }
    private createComponents() {
        if (!this.config.components) {
            return;
        }

        const keys = Object.keys(this.config.components) as ComponentName[];
        const gameElement = queryHTML<GameElement>('game-element');
        gameElement.init(keys);

        const entries = Object.entries(this.config.components) as Required<ComponentsEntries>;
        const initComponent = (entry: Required<ComponentsEntries>[number]) => {
            const name = entry![0];
            switch (name) {
                case 'items':
                    this.components.push(new Items(game, entry[1]!));
                    break;
                case 'passives':
                    this.components.push(new Passives(game, entry[1]!));
                    break;
                case 'achievements':
                    this.components.push(new Achievements(game, entry[1]!));
                    break;
                case 'missions':
                    this.components.push(new Missions(game, entry[1]!));
                    break;
            }
        }
        for (const entry of entries) {
            const data = entry[1]!;
            this.player.stats.level.registerCallback('levelReq' in data ? data.levelReq : 1, () => {
                initComponent(entry);
            });
        }
    }

    private setupDevHelpers() {
        if ('TS' in window) {
            return;
        }
        Object.defineProperty(window, 'TS', {
            value: {
                setLevel: (v: number) => this.player.stats.level.set(v),
                setGold: (v: number) => this.player.stats.gold.set(v),
                save: () => {
                    this.onSave.invoke(this.saveObj);
                    localStorage.setItem('save', JSON.stringify(this.saveObj));
                    console.log(this.saveObj);
                },
                load: async () => {
                    const str = localStorage.getItem('save');
                    if (!str) {
                        return;
                    }
                    const saveObj = JSON.parse(str) as Save;
                    game.init(this.config, saveObj);
                }
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


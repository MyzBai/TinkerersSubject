import { registerTabs, queryHTML, isLocalHost } from "@utils/helpers";
import Player from './Player';
import Enemy from './Enemy';
import Skills from './skills/Skills';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import Statistics from "./Statistics";
import EventEmitter from "@src/utils/EventEmitter";
import Items from "./components/items/Items";
import type Component from "./components/Component";
import Passives from "./components/Passives";
import Achievements from "./components/Achievements";
import Missions from "./components/Missions";
import type { ComponentName } from "@src/types/gconfig";
import type { GameElement } from "@src/webComponents/GameElement";
import saveManager from "@src/utils/saveManager";
import type { Save } from "@src/types/save";
import Settings from "./Settings";
import Home from "@src/Home";


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
    readonly settings: Settings;
    readonly components: Component[] = [];
    readonly onSave = new EventEmitter<Save>();
    private _config: GConfig | undefined;
    private _saveObj: Save | undefined;
    constructor(readonly home: Home) {
        this.enemy = new Enemy(this);
        this.player = new Player(this);
        this.skills = new Skills(this);

        this.statistics = new Statistics(this);
        this.settings = new Settings(this);

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

        this.dispose();

        this.enemy.init();
        this.player.init();
        this.skills.init();
        this.statistics.init();

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

    async dispose() {
        this.onSave.removeAllListeners();
        this.gameLoop.reset();
        this.disposeComponents();
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
                    this.components.push(new Items(this, entry[1]!));
                    break;
                case 'passives':
                    this.components.push(new Passives(this, entry[1]!));
                    break;
                case 'achievements':
                    this.components.push(new Achievements(this, entry[1]!));
                    break;
                case 'missions':
                    this.components.push(new Missions(this, entry[1]!));
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
                    this.save();
                },
                load: async () => {
                    this.load(this.config);
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

    async save() {
        const map = await saveManager.load('Game') || new Map<string, Save>();
        const saveObj = map.get(this.config.meta.id) as Save || { meta: { ...this.config.meta } };
        saveObj.meta.lastSavedAt = Date.now();
        this.player.save(saveObj);
        this.enemy.save(saveObj);
        this.statistics.save(saveObj);
        this.skills.save(saveObj);

        for (const component of this.components) {
            component.save(saveObj);
        }

        map.set(this.config.meta.id, saveObj);
        await saveManager.save('Game', Object.fromEntries(map));
    }

    async load(config: GConfig) {
        const map = await saveManager.load('Game');
        if (!map) {
            return false;
        }
        const saveObj = map.get(config.meta.id);
        if (!saveObj) {
            console.log('could not load', config.meta.id);
            return false;
        }

        this.init(config, saveObj);
    }

    async loadMostRecentSave() {
        try {
            const map = await saveManager.load('Game');
            if (!map) {
                return;
            }
            return [...map].map(x => x[1]).sort((a, b) => b.meta.lastSavedAt - a.meta.lastSavedAt)[0];
        } catch (e) {
            console.error(e);
        }
    }

    async deleteSave() {
        const map = await saveManager.load('Game');
        if (!map) {
            return;
        }
        if (map?.delete(this.config.meta.id)) {
            return await saveManager.save('Game', Object.fromEntries(map));
        }
    }

    async hasSave(id: Save['meta']['id']) {
        const map = await saveManager.load('Game');
        if (!map) {
            return false;
        }
        return map.has(id);
    }
}


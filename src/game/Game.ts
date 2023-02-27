import { registerTabs, querySelector, isLocalHost } from "@utils/helpers";
import Player from './Player';
import Enemy from './Enemy';
import type GConfig from "@src/types/gconfig";
import Loop from "@utils/Loop";
import Statistics from "./Statistics";
import EventEmitter from "@src/utils/EventEmitter";
import type { ComponentName } from "@src/types/gconfig";
import gameHtml from '@html/game.html';
import saveManager from "@src/utils/saveManager";
import type { Save } from "@src/types/save";
import Home from "@src/Home";

import { VisibilityObserver } from "@src/utils/Observers";
import Component from "./components/Component";
import { componentConfigs, loadComponent } from "./components/loader";

export default class Game {
    readonly page: HTMLElement;
    readonly gameLoop = new Loop();
    readonly enemy: Enemy;
    readonly player: Player;
    readonly statistics: Statistics;
    readonly visiblityObserver: VisibilityObserver;
    readonly componentsList: Component[] = [];
    readonly onSave = new EventEmitter<Save>();
    private _config: GConfig | undefined;
    private _saveObj: Save | undefined;
    constructor(readonly home: Home) {
        this.page = new DOMParser().parseFromString(gameHtml, 'text/html').querySelector('.p-game')!;
        querySelector('.p-home').after(this.page);
        this.visiblityObserver = new VisibilityObserver(this.gameLoop);
        this.page = querySelector('.p-game');
        this.enemy = new Enemy(this);
        this.player = new Player(this);

        this.statistics = new Statistics(this);

        if (isLocalHost()) {
            this.setupDevHelpers();
        }

        querySelector('[data-target="home"]', this.page).addEventListener('click', () => {
            this.page.classList.add('hidden');
            querySelector('.p-home').classList.remove('hidden');
        });
        registerTabs(querySelector('[data-main-menu]', this.page), querySelector('[data-main-view]', this.page));
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
        this.statistics.init();

        this.initComponents();

        this.gameLoop.subscribe(() => {
            this.statistics.statistics["Time Played"].add(1);
        }, { intervalMilliseconds: 1000 });

        querySelector('[data-config-name]', this.page).textContent = this._config.meta.name;

        this.gameLoop.subscribe(() => {
            this.save();
        }, { intervalMilliseconds: 1000 * 60 });

        await this.setup();

        await this.save();
    }

    async setup() {
        this.player.setup();

        if (!isLocalHost()) {
            this.gameLoop.start();
        }
        querySelector('[data-tab-target="combat"]', this.page).click();
        document.querySelectorAll('[data-highlight-notification]').forEach(x => x.removeAttribute('data-highlight-notification'));
    }

    async dispose() {
        this.onSave.removeAllListeners();
        this.gameLoop.reset();
        this.disposeComponents();
        this.visiblityObserver.disconnectAll();
    }

    private initComponents() {
        const menuContainer = querySelector('[data-main-menu] .s-components', this.page);
        menuContainer.replaceChildren();
        if (!this.config.components) {
            return;
        }
        for (const key of Object.keys(componentConfigs)) {
            const data = this.config.components[key as ComponentName];
            if (!data) {
                continue;
            }
            this.player.stats.level.registerCallback('levelReq' in data ? data.levelReq : 1, () => {
                const component = loadComponent(this, key as ComponentName);
                this.componentsList.push(component);
            });
        }

    }

    private disposeComponents() {
        for (const componentData of this.componentsList) {
            componentData.dispose();
        }
        this.componentsList.splice(0);
    }

    private setupDevHelpers() {
        if ('TS' in window) {
            return;
        }
        Object.defineProperty(window, 'TS', {
            value: {
                setLevel: (v: number) => {
                    this.player.stats.level.set(v);
                    this.enemy.setIndex(v - 1);
                    this.enemy.spawn();
                },
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
        document.body.addEventListener('keydown', x => {
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
        // this.skills.save(saveObj);

        for (const componentData of this.componentsList) {
            componentData.save(saveObj);
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

    async deleteSave(id: string) {
        const map = await saveManager.load('Game');
        if (!map) {
            return;
        }
        if (map?.delete(id)) {
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
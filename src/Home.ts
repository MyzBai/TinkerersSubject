import Game, { GameConfig, MetaConfig, Save } from "@src/game/Game";
import { generateTime, isLocalHost, querySelector, registerTabs } from "./utils/helpers";
import { configValidator } from "@src/utils/validateConfig";
import configList from '@public/gconfig/configList.json';
import saveManager from "@src/utils/saveManager";
import customAlert from "./utils/alert";
import Statistics from "./game/Statistics";
import Player from "./game/Player";

const entryTypes = ['new', 'saved'] as const;
type EntryType = typeof entryTypes[number];

type Entry = Partial<MetaConfig & { description: string }>

export class Home {
    private readonly page = querySelector('.p-home');
    private activeEntry: Entry = {};
    constructor() {
        this.setupEventListeners();

        querySelector('header [data-target]').classList.add('hidden');
        querySelector('.p-home > menu [data-type="new"]').click();

        window.TS = {
            deleteAllSaves: async () => {
                const saves = await this.createEntries('saved') as DeepPartial<MetaConfig>[];
                const ids = saves.map(x => x.id ? x.id : undefined).filter((x): x is Exclude<string, null | undefined> => typeof x === 'string');
                for (const id of ids) {
                    await Game.deleteSave(id);
                }
            },
            game: Game,
            player: Player,
            statistics: Statistics
        };
    }

    private setupEventListeners() {

        this.page.querySelectorForce('[data-target="game"]').addEventListener('click', () => {
            this.page.classList.add('hidden');
            querySelector('.p-game').classList.remove('hidden');
        });

        registerTabs(querySelector('.p-home > menu'), querySelector('.p-home .s-main'), target => {
            const type = target.getAttribute('data-tab-target') as EntryType;
            if (!entryTypes.includes(type)) {
                throw Error('wrong type');
            }
            this.populateEntryList(type);
        });

        //start new config button
        querySelector('.p-home .p-new [data-entry-info] [data-start]').addEventListener('click', this.startNewConfigCallback.bind(this));
        //start saved config button
        querySelector('.p-home .p-saved [data-entry-info] [data-start]').addEventListener('click', async () => {
            const map = await saveManager.load<Save>('Game');
            if (map && this.activeEntry.id) {
                const save = map.get(this.activeEntry.id);
                if (save) {
                    await this.startSavedGame(save);
                }
            }
        });
        //delete saved config button
        querySelector('.p-home .p-saved [data-entry-info] [data-delete]').addEventListener('click', this.deleteSavedGame.bind(this));
    }

    private async startNewConfigCallback() {
        if (!this.activeEntry.name) {
            console.error('no entry selected');
            return;
        }
        const map = await saveManager.load<Save>('Game');
        const save = map ? Array.from(map).find(([_key, value]) => value.meta.name === this.activeEntry.name)?.[1] : undefined;
        if (save && save.meta) {
            customAlert({
                title: "Configuration already exists",
                body: "You already have a save with this configuration.\n\nNew - Start a new game with a new save file\nOverride - Start a new game and override save file\nContinue - Start from save file",
                buttons: [
                    {
                        label: 'New', type: 'confirm', callback: () => this.startNewGame()
                    },
                    {
                        label: 'Override', type: 'confirm', callback: () => this.startSavedGame(save, true)
                    },
                    {
                        label: 'Continue', type: 'confirm', callback: () => this.startSavedGame(save)
                    },
                    {
                        label: 'Cancel', type: 'cancel'
                    }
                ]
            });
        } else {
            await this.startNewGame();
        }
    }

    private deleteSavedGame() {
        const deleteSave = async () => {
            if (this.activeEntry.id) {
                await Game.deleteSave(this.activeEntry.id);
                this.populateEntryList('saved');
            }
        };
        customAlert({
            title: 'Delete Save',
            body: 'Are you sure?',
            buttons: [{ label: 'Yes', type: 'confirm', callback: deleteSave }, { label: 'No', type: 'cancel' }],
            footerText: 'This will delete your save file permanently'
        });
    }

    async tryLoadRecentSave() {
        const save = await Game.getMostRecentSave();
        if (!save || !save.meta) {
            return false;
        }
        this.activeEntry = { ...save.meta };
        await this.startSavedGame(save);
    }

    async populateEntryList(type: EntryType) {
        const page = querySelector(`.p-home .p-${type}`);
        const listContainer = page.querySelectorForce(`.p-home [data-entry-list]`);
        const infoContainer = page.querySelectorForce(`.p-home [data-entry-info]`);
        listContainer.classList.add('hidden');
        infoContainer.classList.add('hidden');
        const entries = await this.createEntries(type);
        const elements = this.createEntryListElements(entries, type);
        listContainer.replaceChildren(...elements);
        if (elements.length === 0) {
            let msg = '';
            switch (type) {
            case 'new': msg = 'Configuration list is empty'; break;
            case 'saved': msg = 'There are no saved games'; break;
            }
            listContainer.textContent = msg;
        }
        listContainer.classList.remove('hidden');
        infoContainer.classList.toggle('hidden', entries.length === 0);
        elements[0]?.click();
    }

    private createEntryListElements(entries: Entry[], type: EntryType) {
        const elements: HTMLLIElement[] = [];
        for (const entry of entries) {
            const { name, rawUrl } = entry;
            if (!name || !rawUrl) {
                throw Error('invalid entry');
            }
            const li = document.createElement('li');
            li.classList.add('g-list-item');
            if (type === 'new') {

                const suffix = rawUrl.startsWith('https') || !isLocalHost() ? '' : '(Local) ';
                const label = suffix.concat(name);
                li.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
            } else if (type === 'saved' && 'lastSavedAt' in entry) {
                const timeData = generateTime(entry.lastSavedAt);
                const timeSinceLastSaveText = `Last played: ${timeData.hours > 0 ? timeData.hours + 'h ' : ''}${timeData.mins}min`;
                li.insertAdjacentHTML('beforeend', `
                <span>${name}</span>
                <span data-type="date">${timeSinceLastSaveText}</span>`);
            }
            li.addEventListener('click', () => {
                this.activeEntry = entry;
                elements.forEach(x => x.classList.toggle('selected', x === li));
                this.showEntry(entry, type);
            });
            elements.push(li);
        }
        return elements;
    }

    private showEntry(entry: Entry, type: EntryType) {
        if (!entry.name) {
            throw Error();
        }
        const infoContainer = querySelector(`.p-home [data-tab-content="${type}"] [data-entry-info]`);
        infoContainer.querySelectorForce('[data-title]').textContent = entry.name;
        infoContainer.querySelectorForce('[data-desc]').textContent = entry.description || '';
    }

    private async createEntries(type: EntryType) {
        try {
            if (type === 'new') {
                return configList.list.map<Entry>(x => ({ ...x, id: '' }));
            }
            const map = await saveManager.load<Save>('Game');
            if (!map) {
                return [];
            }
            return Array.from(map.values()).map(x => x.meta).sort((a, b) => b.lastSavedAt - a.lastSavedAt);

        } catch (e) {
            throw Error('failed to create entries');
        }
    }

    //new game
    async startNewGame() {
        const { name, rawUrl } = this.activeEntry;
        if (!name || !rawUrl) {
            throw Error();
        }
        const entry: MetaConfig = {
            id: crypto.randomUUID(),
            name,
            rawUrl,
            createdAt: 0,
            lastSavedAt: 0,
        };
        await this.startGame(entry);
    }

    async startSavedGame(save: Save, override = false) {
        const { name, rawUrl } = this.activeEntry;
        if (!name || !rawUrl) {
            return;
        }
        const entry: MetaConfig = {
            id: save.meta.id,
            createdAt: override ? Date.now() : save.meta.createdAt,
            lastSavedAt: override ? save.meta.createdAt : 0,
            name,
            rawUrl
        };

        if (override) {
            await Game.deleteSave(entry.id);
            await this.startGame(entry);
        } else {
            await this.startGame(entry, save);
        }

    }

    async getConfig(url: string) {
        const config = await (await fetch(url)).json() as GameConfig;
        if (!configValidator(config)) {
            console.error(`config at: ${url} is not valid`, configValidator.errors);
            return false;
        }
        return config;
    }

    async startGame(entry: MetaConfig, saveObj?: Save) {
        try {
            const config = await this.getConfig(entry.rawUrl);
            if (!config) {
                return;
            }
            config.meta = entry;
            await Game.init(config, saveObj);
            const navBtn = querySelector('header [data-target]');
            navBtn.classList.remove('hidden');
            navBtn.click();
        } catch (e) {
            console.error(`Failed to load "${this.activeEntry.name}" at: ${this.activeEntry.rawUrl}`);
            console.error(e);
        }

    }
}

export default new Home();
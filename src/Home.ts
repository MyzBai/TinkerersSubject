import { generateTime, querySelector, registerTabs } from "./utils/helpers";
import type GConfig from "@src/types/gconfig";
import { validateConfig } from "@src/utils/validateConfig";
import Game from "@src/game/Game";
import type { Save } from "@src/types/save";
import configList from '@public/gconfig/configList.json';
import saveManager from "@src/utils/saveManager";

const entryTypes = ['new', 'saved'] as const;
type EntryType = typeof entryTypes[number];

export default class Home {
    private readonly page = querySelector('.p-home'); 
    readonly game: Game;
    private activeEntry?: GConfig['meta'];
    constructor() {
        this.game = new Game(this);
        this.setupEventListeners();
        this.init();
    }
    private setupEventListeners() {

        querySelector('[data-target="game"]', this.page).addEventListener('click', () => {
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

        querySelector('.p-home .p-new [data-entry-info] [data-start]').addEventListener('click', () => {
            if (!this.activeEntry) {
                return;
            }
            this.tryStartGame(this.activeEntry,);
        });
        querySelector('.p-home .p-saved [data-entry-info] [data-start]').addEventListener('click', async () => {
            if (!this.activeEntry) {
                return;
            }
            const map = await saveManager.load('Game');
            if (!map) {
                return;
            }
            const saveObj = map.get(this.activeEntry.id);
            if (!saveObj) {
                return;
            }
            this.tryStartGame(this.activeEntry, saveObj);
        });
        //start new config button
        querySelector('.p-home .p-new [data-entry-info] [data-start]').addEventListener('click', this.startNewConfig.bind(this, this.activeEntry));
        //start saved config button
        querySelector('.p-home .p-saved [data-entry-info] [data-start]').addEventListener('click', this.startSavedConfig.bind(this));
        //delete saved config button
        querySelector('.p-home .p-saved [data-entry-info] [data-delete]').addEventListener('click', this.deleteSavedConfig.bind(this));
    }

    async init() {
        const navBtn = querySelector('header [data-target]');
        navBtn.setAttribute('data-target', 'home');
        navBtn.click();
        navBtn.classList.add('hidden');
        querySelector('.p-home > menu [data-type="new"]').click();
    }

    async tryLoadRecentSave() {
        const save = await this.game.loadMostRecentSave();
        if (!save) {
            return false;
        }
        const success = await this.tryStartGame(save.meta, save);
        if (success) {

        }
        return
    }

    async populateEntryList(type: EntryType) {
        const page = querySelector(`.p-home .p-${type}`);
        const listContainer = querySelector(`.p-home [data-entry-list]`, page);
        const infoContainer = querySelector(`.p-home [data-entry-info]`, page);
        const entries = await this.getEntries(type);
        listContainer.style.visibility = entries.length === 0 ? 'true' : 'false';
        const elements = this.createEntryListElements(entries, type);
        const container = querySelector(`.p-home [data-tab-content=${type}]`);
        const entryListContainer = querySelector('[data-entry-list]', container);
        querySelector('[data-entry-list]', container).replaceChildren(...elements);
        if (elements.length === 0) {
            let msg = '';
            switch (type) {
                case 'new': msg = 'Configuration list is empty'; break;
                case 'saved': msg = 'There are no saved games'; break;
            }
            listContainer.textContent = msg;
            infoContainer.classList.add('hidden');
        }
        querySelector('.p-home [data-entry-info]').classList.toggle('hidden', elements.length === 0);
        elements[0]?.click();
    }

    private createEntryListElements(entries: GConfig['meta'][], type: EntryType) {
        const elements: HTMLLIElement[] = [];
        for (const entry of entries) {
            const li = document.createElement('li');
            li.classList.add('g-list-item');
            if (type === 'new') {
                const suffix = entry.rawUrl.startsWith('https') ? '' : '(Local) ';
                const label = suffix.concat(entry.name);
                li.insertAdjacentHTML('beforeend', `<span>${label}</span>`);
            } else if (type === 'saved') {
                const timeData = generateTime(entry.lastSavedAt);
                const timeSinceLastSaveText = `Last played: ${timeData.hours > 0 ? timeData.hours + 'h ' : ''}${timeData.mins}min`;
                li.insertAdjacentHTML('beforeend', `
                <span>${entry.name}</span>
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

    private showEntry(entry: GConfig['meta'], type: EntryType) {
        const infoContainer = querySelector(`.p-home [data-tab-content="${type}"] [data-entry-info]`);
        querySelector('[data-title]', infoContainer).textContent = entry.name;
        querySelector('[data-desc]', infoContainer).textContent = entry.description || '';
    }

    private async tryStartGame(entry: GConfig['meta'], saveObj?: Save) {
        try {
            const config = await (await fetch(entry.rawUrl)).json() as GConfig;
            if (!validateConfig(config)) {
                console.error(`${entry.name} is not valid`);
                return false;
            }

            if (!saveObj) {
                saveObj = {
                    meta: { ...entry, createdAt: Date.now() }
                }
            }
            config.meta = saveObj.meta;

            this.game.init(config, saveObj);

            const navBtn = querySelector('header [data-target]');
            navBtn.classList.remove('hidden');
            navBtn.click();
            return true;
        } catch (e) {
            console.error(e);
        }

    }

    private async getEntries(type: EntryType): Promise<GConfig['meta'][]> {
        switch (type) {
            case 'new':
                return configList.list.map(x => ({ ...x, id: crypto.randomUUID(), createdAt: 0, lastSavedAt: 0 }));
            case 'saved':
                const map = await saveManager.load('Game');
                if (!map) {
                    return [];
                }
                try {
                    return Array.from(map.values()).map(x => x.meta).sort((a, b) => b.lastSavedAt - a.lastSavedAt);
                } catch (element) {
                    throw Error('failed to load save');
                }
        }
    }
}

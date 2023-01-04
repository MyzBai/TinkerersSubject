import type GConfig from "@src/types/gconfig";
import configList from '@public/gconfig/configList.json';
import saveManager from "@src/utils/saveManager";
import type { Save } from "@src/game/saveGame";

export type EntryType = 'new' | 'save';

interface EntryHandler {
    getEntries: () => Promise<ConfigEntry[]>;
    getEntryListElements(): Promise<HTMLLIElement[]>;
}

export interface ConfigEntry {
    type: EntryType;
    name: string;
    description?: string;
    rawUrl: string;
    id?: string;
    createdAt?: number;
    lastSavedAt?: number;
}

let activeEntry: ConfigEntry;

export class ConfigEntryHandler {
    config: GConfig | undefined;
    private remoteEntryHandler = new NewEntryHandler();
    private savedEntryHandler = new SavedEntryHandler();
    constructor() { }

    getActiveEntry() {
        return activeEntry;
    }

    async getEntryListElements(type: EntryType) {
        switch (type) {
            case 'new': return await this.remoteEntryHandler.getEntryListElements();
            case 'save': return await this.savedEntryHandler.getEntryListElements();
        }
    }
}

class NewEntryHandler implements EntryHandler {
    constructor() { }

    async getEntries() {
        return configList.list.map<ConfigEntry>(x => ({ ...x, type: 'new' }));
    }


    async getEntryListElements() {
        const entries = await this.getEntries();
        const elements = [] as HTMLLIElement[];
        for (const entry of entries) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            const suffix = entry.rawUrl.startsWith('https:') ? '' : ' (Local)';
            element.textContent = entry.name + suffix;
            element.addEventListener('click', () => {
                activeEntry = entry;
            });
            elements.push(element);
        }
        return elements;
    }
}

class SavedEntryHandler implements EntryHandler {
    constructor() { }

    async getEntries() {
        const blob = await saveManager.load('Game') as { [K: string]: Save };
        if (!blob) {
            return [];
        }
        const arr = Object.values(blob).sort((a,b) => b.meta.lastSavedAt - a.meta.lastSavedAt);
        return arr.map<ConfigEntry>(x => ({ ...x.meta, type: 'save' }));
    }

    async getEntryListElements() {
        const entries = await this.getEntries();
        const elements = [] as HTMLLIElement[];
        for (const entry of entries.filter(x => x.rawUrl)) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            const timeText = this.generateTimeText(entry.lastSavedAt);
            element.insertAdjacentHTML('beforeend', `<div>${entry.name}</div><div class="g-text-small">${timeText}</div>`);
            element.addEventListener('click', () => {
                activeEntry = entry;
            });
            elements.push(element);
        }
        return elements;
    }

    private generateTimeText(startTime = 0) {
        const ms = Date.now() - startTime;
        const days = Math.floor(ms / 86400000).toFixed();
        const hours = (Math.floor(ms / 3600000) % 24).toFixed();
        const mins = (Math.floor(ms / 60000) % 60).toFixed();
        return `Last Played ${days}d ${hours}h ${mins}min`;
    }

}

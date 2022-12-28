import type GConfig from "@src/types/gconfig";
import { loadEntries as loadRemoteEntries } from "./remoteConfigEntries";
import { loadEntries as loadLocalEntries } from "./localConfigEntries";

export type EntryType = 'remote' | 'local';

interface EntryHandler {
    getEntries: () => Promise<ConfigEntry[]>;
    getEntryListElements(): Promise<HTMLLIElement[]>;
}

export interface ConfigEntry {
    name: string;
    url: string;
    id?: string;
    startTimeMS?: number;
}

let activeEntry: ConfigEntry;

export class ConfigEntryHandler {
    config: GConfig | undefined;
    private remoteEntryHandler = new RemoteEntryHandler();
    private localEntryHandler = new LocalEntryHandler();
    constructor() { }

    getActiveEntry(){
        return activeEntry;
    }

    async getEntryListElements(type: 'remote' | 'local'){
        switch(type){
            case 'remote': return await this.remoteEntryHandler.getEntryListElements();
            case 'local': return await this.localEntryHandler.getEntryListElements();
        }
    }
}

class RemoteEntryHandler implements EntryHandler {
    constructor() { }

    async getEntries() {
        return await loadRemoteEntries();
    }


    async getEntryListElements(){
        const entries = await this.getEntries();
        const elements = [] as HTMLLIElement[];
        for (const entry of entries) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            element.textContent = entry.name;
            element.addEventListener('click', () => {
                activeEntry = entry;
            });
            elements.push(element);
        }
        return elements;
    }
}

class LocalEntryHandler implements EntryHandler {
    constructor() {

    }

    async getEntries() {
        return await loadLocalEntries();
    }

    async getEntryListElements() {
        const entries = await this.getEntries();
        const elements = [] as HTMLLIElement[];
        for (const entry of entries) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            const timeText = this.generateTimeText(entry.startTimeMS);
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
        console.log(ms);
        const days = Math.floor(ms / 86400000).toFixed();
        const hours = (Math.floor(ms / 3600000) % 24).toFixed();
        const mins = (Math.floor(ms / 60000) % 60).toFixed();
        return `Last Played ${days}d ${hours}h ${mins}min`;
    }

}

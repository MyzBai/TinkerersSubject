import type GConfig from "@src/types/gconfig";
import { queryHTML } from "@src/utils/helpers";
import { type ConfigEntry, loadRemoteConfigEntries, loadConfigAtUrl, loadSavedConfigEntries } from "./configLoader";
import { init as initGame } from '../game/game';

const configList = queryHTML('.p-home [data-config-list]');
const configInfoContainer = queryHTML('.p-home [data-config-info]');
const startButton = queryHTML('[data-start]', configInfoContainer);
startButton.addEventListener('click', () => startConfig());

let activeConfig: GConfig | undefined;
let activeEntry: ConfigEntry | undefined;

async function startConfig() {
    console.log(activeConfig, activeEntry);
    if (!activeConfig || !activeEntry) {
        return;
    }

    const configCopy = JSON.parse(JSON.stringify(activeConfig));
    const entryCopy = JSON.parse(JSON.stringify(activeConfig));
    assignMetaData(configCopy, entryCopy);

    await initGame(configCopy);

    queryHTML('body > header button[data-tab-target]').click();
}

function assignMetaData(config: GConfig, entry: ConfigEntry) {
    console.log('assign meta data');
    const meta = config.meta || { ...entry };
    if (!meta.id) {
        meta.id = crypto.randomUUID();
    }
    config.meta = meta;
}

export abstract class ConfigEntryHandler {
    protected map = new Map<string, GConfig>();
    protected config: GConfig | undefined;
    protected configEntry: ConfigEntry | undefined;
    constructor() { }

    public abstract loadEntryDataList(): Promise<ConfigEntry[]>;
    protected abstract populateConfigList(): void;

    protected async showConfig(entry: ConfigEntry) {

        this.config = await loadConfigAtUrl(entry.url);
        startButton.toggleAttribute('disabled', typeof this.config !== 'object');
        if (!this.config) {
            return;
        }

        const { description } = this.config.meta;
        queryHTML('[data-title]', configInfoContainer).textContent = entry.name;
        queryHTML('[data-desc]', configInfoContainer).textContent = description || '';

        activeConfig = this.config;
        activeEntry = entry;
    }

    protected createBaseListElements(entries: ConfigEntry[]) {
        const elements = [] as HTMLLIElement[];
        for (const entry of entries) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            element.addEventListener('click', async () => {
                elements.forEach(x => x.classList.toggle('selected', x === element));
                this.showConfig(entry);
            });
            elements.push(element);
        }
        return elements;
    }
}

export class RemoteConfigEntryHandler extends ConfigEntryHandler {

    constructor() {
        super();
    }

    async loadEntryDataList(): Promise<ConfigEntry[]> {
        return await loadRemoteConfigEntries();
    }

    public async populateConfigList() {
        const entries = await this.loadEntryDataList();
        const elements = this.createBaseListElements(entries);

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const entry = entries[i];
            if (!element || !entry) {
                continue;
            }
            element.classList.add('save-element');
            element.textContent = entry.name;
        }
        elements[0]?.click();
        configList.replaceChildren(...elements);
    }
}

export class LocalConfigEntryHandler extends ConfigEntryHandler {
    constructor() {
        super();
    }

    async loadEntryDataList(): Promise<ConfigEntry[]> {
        return await loadSavedConfigEntries();
    }

    public async populateConfigList() {
        const entries = await this.loadEntryDataList();
        const elements = this.createBaseListElements(entries);
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const entry = entries[i];
            if (!element || !entry) {
                console.error('entries out of sync with html elements');
                continue;
            }
            element.classList.add('save-element');
            element.insertAdjacentHTML('beforeend', `<div>${entry.name}</div><div>Test</div>`);
        }
        elements[0]?.click();
        configList.replaceChildren(...elements);
    }
}
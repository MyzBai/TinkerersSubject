import type GConfig from "@src/types/gconfig";
import { queryHTML } from "@src/utils/helpers";
import { type ConfigEntry, loadRemoteConfigEntries, loadConfigAtUrl, loadSavedConfigEntries } from "./configLoader";
import { init as initGame } from '../game/game';

const configList = queryHTML('.p-home [data-config-list]');
const configInfoContainer = queryHTML('.p-home [data-config-info]');
const startButton = queryHTML('[data-start]', configInfoContainer);


export abstract class ConfigEntryHandler {
    protected map = new Map<string, GConfig>();
    protected config: GConfig | undefined;
    protected configEntry: ConfigEntry | undefined;
    constructor() {}

    public abstract loadEntryDataList(): Promise<ConfigEntry[]>;
    protected abstract populateConfigList(): void;

    protected async showConfig(entry: ConfigEntry) {

        this.config = await loadConfigAtUrl(entry.url);
        if (!this.config) {
            return;
        }

        const { description } = this.config.meta;
        queryHTML('[data-title]', configInfoContainer).textContent = entry.name;
        queryHTML('[data-desc]', configInfoContainer).textContent = description || '';

        startButton.toggleAttribute('disabled', typeof this.config !== 'object');
    }

    protected async startConfig() {
        if (!this.config || !this.configEntry) {
            return;
        }
        console.log('start');
        this.assignMetaData();
        console.log(this.config.meta);
        await initGame(this.config);
        queryHTML('body > header button[data-tab-target]').click();
    }

    protected assignMetaData() {
        if (!this.config || !this.configEntry) {
            return;
        }
        console.log('assign meta data');
        const meta = this.config.meta || { ...this.configEntry };
        if (!meta.id) {
            meta.id = crypto.randomUUID();
        }
        this.config.meta = meta;
    }

    protected createBaseListElements(count: number) {
        const elements = [] as HTMLLIElement[];
        for (let i = 0; i < count; i++) {
            const element = document.createElement('li');
            element.classList.add('g-list-item');
            element.addEventListener('click', () => {
                elements.forEach(x => x.classList.toggle('selected', x === element));
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
        const elements = this.createBaseListElements(entries.length);

        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const entry = entries[i];
            if (!element || !entry) {
                continue;
            }
            element.classList.add('save-element');
            element.textContent = entry.name;
            element.addEventListener('click', async () => {
                const config = await loadConfigAtUrl(entry.url);
                if (!config) {
                    return;
                }
                this.showConfig(entry);
            });
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
        const elements = this.createBaseListElements(entries.length);
        console.log('k');
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const entry = entries[i];
            if (!element || !entry) {
                continue;
            }
            element.classList.add('save-element');
            element.insertAdjacentHTML('beforeend', `<div>${entry.name}</div><div>Test</div>`);
            element.addEventListener('click', async () => {
                const config = await loadConfigAtUrl(entry.url);
                if (!config) {
                    return;
                }
                this.showConfig(entry);
            });
        }
        elements[0]?.click();
        configList.replaceChildren(...elements);
    }
}
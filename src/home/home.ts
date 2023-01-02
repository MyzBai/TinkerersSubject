import { queryHTML } from "../utils/helpers";
import { ConfigEntry, ConfigEntryHandler, EntryType } from "./configEntryHandlers";
import { init as initGame } from '../game/game';
import type GConfig from "@src/types/gconfig";
import { validateRawUrl } from "./remoteConfigEntries";
import { validateConfig } from "@src/utils/validateConfig";
import { visibilityObserver } from "@src/utils/Observers";

const newButton = queryHTML('[data-type="remote"]');
const loadButton = queryHTML('[data-type="local"]');

const entryListContainer = queryHTML('[data-config-list]');
const configInfoContainer = queryHTML('[data-config-info]');
const startConfigButton = queryHTML('[data-start]', configInfoContainer);

const configEntryHandler = new ConfigEntryHandler();

let startConfigListener: ((ev: MouseEvent) => void);

[newButton, loadButton].forEach((x, _i, arr) => {
    x.addEventListener('click', async () => {
        arr.forEach(y => y.classList.toggle('selected', y === x));
        const type = x.getAttribute('data-type') as EntryType;
        populateEntryList(type);
    });
});

visibilityObserver(queryHTML('.p-home'), (visible, observer) => {
    if(visible){
        newButton.click();
        observer.disconnect();
    }
});

async function startConfig(entry: ConfigEntry, config: GConfig) {

    config.meta = { ...config.meta, ...entry };
    if(!config.meta.id){
        config.meta.id = crypto.randomUUID();
    }
    if(!config.meta.createdAt){
        config.meta.createdAt = Date.now();
    }

    const valid = validateConfig(config);
    if(!valid){
        console.log('Configuration is not valid');
        return;
    }

    await initGame(config);

    queryHTML('body > header [data-tab-target="game"]').click();
}

async function showConfig(entry: ConfigEntry) {
    const config = await loadConfigAtUrl(entry.url);
    if (!config) {
        console.error('invalid url');
        return;
    }

    queryHTML('[data-title]', configInfoContainer).textContent = config.meta.name;
    queryHTML('[data-desc]', configInfoContainer).textContent = config.meta.description || '';

    startConfigButton.removeEventListener('click', startConfigListener);
    startConfigListener = () => {
        startConfig(entry, config);
    };
    startConfigButton.addEventListener('click', startConfigListener);
}

async function populateEntryList(type: EntryType){
    const elements = await configEntryHandler.getEntryListElements(type);
    configInfoContainer.classList.toggle('hidden', elements.length === 0);

    if(elements.length === 0){
        let msg = '';
        switch(type){
            case 'remote': msg = 'Failed to load remote configurations'; break;
            case 'local': msg = 'You do not have any saved games yet'; break;
        }
        entryListContainer.textContent = msg;
        return;
    }

    for (const element of elements) {
        element.addEventListener('click', () => {
            elements.forEach(x => x.classList.toggle('selected', x === element));
            const entry = configEntryHandler.getActiveEntry();
            showConfig(entry);
        });
    }
    entryListContainer.replaceChildren(...elements);

    elements[0].click();
}

export async function loadConfigAtUrl(url: string): Promise<GConfig | undefined> {
    const validUrl = validateRawUrl(url);
    if (!validUrl) {
        console.error('invalid url');
        return;
    }
    try {
        const json = await (await fetch(url)).json();
        return json as GConfig;
    } catch (e) {
        console.error(e);
    }
}
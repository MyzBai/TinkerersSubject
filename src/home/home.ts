import { queryHTML } from "../utils/helpers";
import { ConfigEntry, ConfigEntryHandler, EntryType } from "./configEntryHandlers";
import { init as initGame } from '../game/game';
import type GConfig from "@src/types/gconfig";
import { validateConfig } from "@src/utils/validateConfig";
import { loadMostRecentSave } from '../game/saveGame';
import { visibilityObserver } from "@src/utils/Observers";

const newButton = queryHTML('menu [data-type="new"]');
const loadButton = queryHTML('menu [data-type="save"]');

const entryListContainer = queryHTML('[data-config-list]');
const configInfoContainer = queryHTML('[data-config-info]');
const startConfigButton = queryHTML('[data-start]', configInfoContainer);

const configEntryHandler = new ConfigEntryHandler();

let startConfigListener: ((ev: MouseEvent) => void);

[newButton, loadButton].forEach((x, i, arr) => {
    x.addEventListener('click', async () => {
        arr.forEach(y => y.classList.toggle('selected', y === x));
        const type = x.getAttribute('data-type') as EntryType;
        populateEntryList(type);
    });
    if (i === 0) {
        x.click();
    }
});

visibilityObserver(queryHTML('.p-game'), visible => {
    if(visible){
        newButton.click();
    }
})

export async function init() {
    await tryAutoLoad();
}

async function tryAutoLoad() {
    const lastSave = await loadMostRecentSave();
    if (!lastSave) {
        return false;
    }
    await startConfig({ ...lastSave.meta, type: 'save' });
    return true;
}

async function startConfig(entry: ConfigEntry) {

    const config = await loadConfigAtUrl(entry.rawUrl);
    if (!config) {
        console.error('invalid url');
        return;
    }
    if (!validateConfig(config)) {
        console.error('invalid configuration');
        return;
    }

    config.meta = {
        name: entry.name,
        description: entry.description,
        rawUrl: entry.rawUrl,
        id: entry.id || crypto.randomUUID(),
        createdAt: entry.createdAt || Date.now(),
    };

    await initGame(config);
    const btn = queryHTML('header [data-tab-target="game"]');
    btn.classList.remove('hidden');
    btn.click();
    return true;
}

async function showConfig(entry: ConfigEntry) {

    queryHTML('[data-title]', configInfoContainer).textContent = entry.name;
    queryHTML('[data-desc]', configInfoContainer).textContent = entry.description || '';

    startConfigButton.removeEventListener('click', startConfigListener);
    startConfigListener = async () => {
        const success = await startConfig(entry);
        if (!success) {
            //error msg, failed to load configuration, try again later
        }
    };
    startConfigButton.addEventListener('click', startConfigListener);
}

async function populateEntryList(type: EntryType) {
    const elements = await configEntryHandler.getEntryListElements(type);
    configInfoContainer.classList.toggle('hidden', elements.length === 0);

    if (elements.length === 0) {
        let msg = '';
        switch (type) {
            case 'new': msg = 'Failed to load any configurations'; break;
            case 'save': msg = 'You do not have any saved games yet'; break;
        }
        entryListContainer.textContent = msg;
        return;
    }

    for (const element of elements) {
        element.addEventListener('click', () => {
            elements.forEach(x => x.classList.toggle('selected', x === element));
            const entry = configEntryHandler.getActiveEntry();
            entry.type = type;
            showConfig(entry);
        });
    }
    entryListContainer.replaceChildren(...elements);

    elements[0].click();
}

async function loadConfigAtUrl(url: string): Promise<GConfig | undefined> {
    try {
        const json = await (await fetch(url)).json();
        return json as GConfig;
    } catch (e) {
        console.error(e);
    }
}
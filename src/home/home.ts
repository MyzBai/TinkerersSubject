import { queryHTML } from "../utils/helpers";
import { ConfigEntry, ConfigEntryHandler, EntryType } from "./configEntryHandlers";
// import { init as initGame } from '../game/game';
import type GConfig from "@src/types/gconfig";
import { validateConfig } from "@src/utils/validateConfig";
<<<<<<< Updated upstream
import { loadGame, loadMostRecentSave, Save } from '../game/saveGame';
import saveManager from "@src/utils/saveManager";
=======
// import { loadMostRecentSave, Save } from '../game/saveGame';
// import saveManager from "@src/utils/saveManager";
import Game from "@src/game/game";
>>>>>>> Stashed changes

const newButton = queryHTML('menu [data-type="new"]');
const loadButton = queryHTML('menu [data-type="save"]');

// const deleteSaveButton = queryHTML('.p-home [data-config-info] [data-role="delete"]');
// deleteSaveButton.addEventListener('click', async () => {
//     const id = deleteSaveButton.getAttribute('data-id');
//     if(!id){
//         return;
//     }
//     const save = await saveManager.load('Game') as { [K: string]: Save };
//     delete save[id];
//     await saveManager.save('Game', save);
//     loadButton.click();
// })

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

export async function init() {
    await tryAutoLoad();
}

async function tryAutoLoad() {
    return false;
    // const lastSave = await loadMostRecentSave();
    // if (!lastSave) {
    //     return false;
    // }
    // await startConfig({ ...lastSave.meta, type: 'save' });
    // return true;
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
        ...entry,
        createdAt: entry.createdAt || Date.now(),
    };

<<<<<<< Updated upstream
    await initGame(config);
    await loadGame(config);
=======
    const game = new Game(config);
    game.setup();
    // await initGame(config);
>>>>>>> Stashed changes
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
    if(!elements){
        return;
    }
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

    // deleteSaveButton.classList.toggle('hidden', type !== 'save');

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

async function loadConfigAtUrl(url: string): Promise<GConfig | undefined> {
    try {
        const json = await (await fetch(url)).json();
        return json as GConfig;
    } catch (e) {
        console.error(e);
    }
}
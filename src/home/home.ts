import type GConfig from "../types/gconfig";
import { queryHTML } from "../utils/helpers";
import { init as initGame } from '../game/game';
import { loadRemoteConfigEntries, loadLocalConfigEntries, loadConfigAtUrl, ConfigEntry } from './configLoader';

const configList = queryHTML('[data-config-list]');
const configInfoContainer = queryHTML('[data-config-info]');
const newButton = queryHTML('[data-type="new"]');
const loadButton = queryHTML('[data-type="load"]');
const startButton = queryHTML('[data-start]', configInfoContainer);
startButton.addEventListener('click', () => startConfig());

[newButton, loadButton].forEach((x, _i, arr) => {
    x.addEventListener('click', () => {
        arr.forEach(y => y.classList.toggle('selected', y === x));
        const type = x.getAttribute('data-type') as 'new' | 'load';
        populateConfigList(type);
    });
});

let activeConfig: GConfig;

const remoteConfigMap = new Map<string, GConfig>();

export async function init() {
    newButton.click();
}

function startConfig() {
    queryHTML('.p-home').classList.toggle('hidden', true);
    initGame(activeConfig);
    queryHTML('.p-game').classList.toggle('hidden', false);
}

function showConfig(name = '', description = '') {
    if (name.length === 0) {
        name = 'Unknown';
        description = 'Failed to load configuration.';
    }
    queryHTML('[data-title]', configInfoContainer).textContent = name;
    queryHTML('[data-desc]', configInfoContainer).textContent = description;

    startButton.toggleAttribute('disabled', typeof activeConfig !== 'object');
}


async function populateConfigList(type: 'new' | 'load') {
    const elements = [] as HTMLElement[];
    let configEntries = [] as ConfigEntry[];
    let emptyMsg = '';
    switch (type) {
        case 'new':
            configEntries = await loadRemoteConfigEntries();
            emptyMsg = 'No configurations available';
            break;
        case 'load':
            configEntries = await loadLocalConfigEntries();
            emptyMsg = 'You have no saved games';
            break;
    }
    if (configEntries.length === 0) {
        const element = document.createElement('p');
        element.textContent = emptyMsg;
        configList.replaceChildren(...[element]);
    } else {
        for (const entry of configEntries) {
            const element = createConfigListItem(entry);
            element.addEventListener('click', () => {
                selectConfigEntry(entry);
                elements.forEach(x => x.toggleAttribute('disabled', x === element));
                elements.forEach(x => x.classList.toggle('selected', x === element));
            });
            elements.push(element);
        }
        configList.replaceChildren(...elements);
        elements[0]?.click();
    }
    configInfoContainer.classList.toggle('hidden', elements.length === 0);
}

function createConfigListItem(entry: ConfigEntry) {
    const item = document.createElement('li');
    item.classList.add('g-list-item');
    item.textContent = entry.name;
    item.setAttribute('data-url', entry.url);
    return item;
}

async function selectConfigEntry(entry: ConfigEntry) {
    let config = remoteConfigMap.get(entry.url);
    if (!config) {
        config = await loadConfigAtUrl(entry.url);
        if (config) {
            remoteConfigMap.set(entry.url, config);
        }
    }
    if (!config) {
        showConfig('Unknown', 'This configuration could not be found!');
        return;
    }
    activeConfig = config;
    showConfig(entry.name, config.meta.description);
}
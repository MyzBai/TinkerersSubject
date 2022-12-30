import './home/home';
import { init as initGame } from './game/game';
import { queryHTML, registerTabs, tabCallback } from './utils/helpers';
import { visibilityObserver } from './utils/Observers';
import { validateConfig } from './utils/validateConfig';
import type GConfig from './types/gconfig';
import type { EnvironmentVariables } from './types/environmentVariables';
import { loadEntries } from './home/localConfigEntries';

const mainPageNavButton = queryHTML('body > header button');
const homePage = queryHTML('.p-home');
const gamePage = queryHTML('.p-game');

declare global {
    var envVariables: EnvironmentVariables;
}

registerTabs(mainPageNavButton.parentElement!, document.body, tabCallback);

visibilityObserver(homePage, visible => {
    if (visible) {
        mainPageNavButton.textContent = 'Back';
        mainPageNavButton.setAttribute('data-tab-target', 'game');
    }
});
visibilityObserver(gamePage, visible => {
    if (visible) {
        mainPageNavButton.textContent = 'Home';
        mainPageNavButton.classList.remove('hidden');
        mainPageNavButton.setAttribute('data-tab-target', 'home');
    }
});

init();

async function init() {

    globalThis.envVariables = await (await fetch('public/env.json')).json();

    if(envVariables.env === 'dev-config'){
        await initConfig();
    } else{
        queryHTML('.p-home').classList.remove('hidden');
    }

    document.body.classList.remove('hidden');
}

async function initConfig() {
    const path = envVariables.gConfigPath;
    try {
        const result = await fetch(path);
        if (result.status === 404) {
            document.body.textContent = `${result.url} | ${result.statusText}`;
            return;
        }
        const config = await result.json() as GConfig;

        const valid = validateConfig(config);
        if (!valid) {
            document.body.textContent = 'Your configuration file is not valid';
            return;
        }

        const entry = (await loadEntries()).find(x => x.id === 'temp');
        config.meta = { ...config.meta, id: 'temp'};
        if (entry) {
            config.meta = { ...config.meta, ...entry };
        }

        await initGame(config);

        queryHTML('body > header [data-tab-target="game"]').click();
    } catch (e) {
        console.error(e);
    }


}
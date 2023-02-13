import { playerStats } from '../player';
import type GConfig from '@src/types/gconfig';
import type { Save } from '../saveGame';
import { init as initPassives, loadPassives, savePassives } from './passives';
import { init as initItems, loadItems, saveItems } from './items/items';
import { init as initMissions, saveMissions, loadMissions } from './missions';
import { init as initAchievements } from './achievements';

type ComponentName =
    | 'passives'
    | 'items'
    | 'missions'
    | 'achievements';

const components: {[K in ComponentName]: (data: GConfig[K]) => void } = {
    passives: initPassives,
    items: initItems,
    missions: initMissions,
    achievements: initAchievements,
}

export function initComponents(config: GConfig) {
    for (const key of Object.keys(components)) {
        initComponent(key as ComponentName, config);
    }
}

function initComponent(key: ComponentName, config: GConfig) {
    const data = config[key];
    if(!data){
        return;
    }
    const levelReq = data.levelReq;
    if (levelReq > 1) {
        const listener = () => {
            playerStats.level.removeListener('change', listener);
            document.querySelector(`.p-game .s-menu [data-tab-target="${key}"]`)?.classList.remove('hidden');
            components[key](data as any);//TODO: Find a way to not cast it to any
        }
        playerStats.level.addListener('change', listener);
    } else {
        document.querySelector(`.p-game .s-menu [data-tab-target="${key}"]`)?.classList.remove('hidden');
        components[key](data as any);
    }
}

export function saveComponents(saveObj: Save) {
    savePassives(saveObj);
    saveItems(saveObj);
    saveMissions(saveObj);
}

export function loadComponents(saveObj: Save) {
    loadPassives(saveObj);
    loadItems(saveObj);
    loadMissions(saveObj);
}
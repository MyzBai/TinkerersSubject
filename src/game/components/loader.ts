import { init as initPassives, loadPassives, savePassives } from './passives';
import { init as initItems, loadItems, saveItems } from './items/items';
import { init as initAchievements } from './achievements';
import type GConfig from '@src/types/gconfig';
import type { Save } from '../saveGame';

// export type ComponentNames = keyof Pick<GConfig, 'passives' | 'items' | 'achievements'>;
const componentNames = ['passives', 'items', 'achievements'] as const;
type ComponentName = typeof componentNames[number];

export function initComponents(config: GConfig) {
    const components = Object.fromEntries(Object.entries(config).filter(([key]) => config[key as ComponentName] && componentNames.includes(key as ComponentName))) as Pick<GConfig, ComponentName>;
    for (const key of Object.keys(components) as ComponentName[]) {
        if (!components[key]) {
            continue;
        }
        switch (key) {
            case 'passives': initPassives(components.passives); break;
            case 'items': initItems(components.items); break;
            case 'achievements': initAchievements(components.achievements); break;
        }
    }
}

export function saveComponents(saveObj: Save){
    savePassives(saveObj);
    saveItems(saveObj);
}

export function loadComponents(saveObj: Save){
    loadPassives(saveObj);
    loadItems(saveObj);
}
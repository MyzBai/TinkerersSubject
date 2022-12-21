import { init as initPassives } from './passives';
import { init as initItems } from './items/items';
import { init as initAchievements } from './achievements';
import type GConfig from '@src/types/gconfig';

// export type ComponentNames = keyof Pick<GConfig, 'passives' | 'items' | 'achievements'>;
const componentNames = ['passives', 'items', 'achievements'] as const;
type ComponentName = typeof componentNames[number];

export default function load(module: GConfig) {
    const components = Object.fromEntries(Object.entries(module).filter(([key]) => module[key as ComponentName] && componentNames.includes(key as ComponentName))) as Pick<GConfig, ComponentName>;
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
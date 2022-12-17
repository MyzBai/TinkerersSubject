import { init as initPassives } from './passives';
import { init as initItems } from './items/items';
import { init as initAchievements } from './achievements';
import type GConfig from '@src/types/gconfig';

export type ComponentNames = keyof Pick<GConfig, 'passives' | 'items' | 'achievements'>;

export default function load(components: Pick<GConfig, ComponentNames>) {
    for (const key of Object.keys(components)) {
        switch(key as ComponentNames){
            case 'passives': initPassives(components.passives); break;
            case 'items': initItems(components.items); break;
            case 'achievements': initAchievements(components.achievements); break;
        }
    }
}
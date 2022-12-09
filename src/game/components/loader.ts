import { init as initItems } from './items/items';
import { init as initAchievements } from './achievements';
import { init as initBounty } from './bounty';
import type GConfig from '@src/types/gconfig';

export type ComponentNames = keyof Pick<GConfig, 'items' | 'achievements' | 'bounty'>;

export default function load(components: Pick<GConfig, ComponentNames>) {
    for (const key of Object.keys(components)) {
        switch(key as ComponentNames){
            case 'items': initItems(components.items); break;
            case 'achievements': initAchievements(components.achievements); break;
            case 'bounty': initBounty(components.bounty); break;
        }
    }
}
import { init as initItems } from './items/items';
import { init as initAchievements } from './achievements';
import type GConfig from '@src/types/gconfig';

export type ComponentNames = keyof Pick<GConfig, 'items' | 'achievements'>;

export default function load(components: Pick<GConfig, ComponentNames>) {
    if (components.items) {
        initItems(components.items);
    }
    if (components.achievements) {
        initAchievements(components.achievements);
    }
}
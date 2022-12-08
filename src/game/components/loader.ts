import { init as initItems } from './items/items';
import { init as initAchievements } from './achievements';
import type GConfig from '@src/types/gconfig';

export type ComponentNames = keyof Pick<GConfig, 'items' | 'achievements'>;
type Properties = Partial<Pick<GConfig, ComponentNames>>;


export default function load(components: Properties) {
    initComponent('items', components.items, initItems);
    initComponent('achievements', components.achievements, initAchievements);
}

function initComponent(name: string, data: Properties[ComponentNames], initFunc: (params: Properties[ComponentNames]) => void){
    
    if(data){
        if(data.levelReq > 1){
            document.querySelector(`.p-game > menu [data-tab-target="${name}"]`).classList.add('hidden');
        }
        initFunc(data);
    } else {
        document.querySelector(`.p-game > menu [data-tab-target="${name}"]`).classList.add('hide');
        document.querySelector(`.p-game .p-${name}`).remove();
    }
}
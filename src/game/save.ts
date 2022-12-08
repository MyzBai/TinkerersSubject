import type { CraftId } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { saveItems, loadItems } from "./components/items/items";
import { saveStatistics, loadStatistics } from "./statistics";

export type ModTemplate = { values: number[]; desc: ModDescription };
export interface Save {
    items?: {
        items: {
            name: string;
            modList: ModTemplate[];
        }[],
        craftPresets: { name: string, ids: CraftId[] }[]
    };
    statistics: { name: string, value: number }[];
}


export function save() {
    const saveObj: Save = {
        statistics: []
    };
    saveItems(saveObj);
    saveStatistics(saveObj);

    console.log('Save', saveObj);

    sessionStorage.setItem('game', JSON.stringify(saveObj));
}

export function load() {
    const saveObj = JSON.parse(sessionStorage.getItem('game'));

    loadItems(saveObj);
    loadStatistics(saveObj);
}
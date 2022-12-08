import type { CraftId } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { saveItems, loadItems } from "./components/items/items";
import { saveStatistics, loadStatistics } from "./statistics";
import { loadPlayer, savePlayer } from "./player";
import { loadSkills, saveSkills } from "./skills";

export type ModTemplate = { values: number[]; desc: ModDescription };

export interface Save {
    player?: {
        level: number;
        gold: number;
        curMana: number;
    },
    skills?: {
        activeSkillName: string;
    },
    items?: {
        items: {
            name: string;
            modList: ModTemplate[];
        }[],
        craftPresets: { name: string, ids: CraftId[] }[]
    };
    statistics?: { name: string, value: number }[];
}


export function save() {
    const saveObj: Save = {};
    savePlayer(saveObj);
    saveSkills(saveObj);
    saveItems(saveObj);
    saveStatistics(saveObj);

    console.log('Save', saveObj);

    sessionStorage.setItem('game', JSON.stringify(saveObj));
}

export function load() {
    const saveObj = JSON.parse(sessionStorage.getItem('game'));

    loadPlayer(saveObj);
    loadSkills(saveObj);
    loadItems(saveObj);
    loadStatistics(saveObj);
}
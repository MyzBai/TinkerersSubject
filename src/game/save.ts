import localforage from 'localforage';
import type { CraftId } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { saveItems, loadItems } from "./components/items/items";
import { saveStatistics, loadStatistics } from "./statistics";
import { loadPlayer, savePlayer } from "./player";
import { loadSkills, saveSkills } from "./skills/skills";


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


export async function save() {
    const saveObj: Save = {};
    savePlayer(saveObj);
    saveSkills(saveObj);
    saveItems(saveObj);
    saveStatistics(saveObj);

    const save = btoa(JSON.stringify(saveObj));
    if (save !== null) {
        const saveBlob = new Blob([save], { type: 'text/plain' });
        await localforage.setItem<Blob>('ts-game', saveBlob);
    } else {
        return false;
    }
    return true;
}

export async function load() {
    
    const blob = await localforage.getItem<Blob>('ts-game');
    if(!blob){
        return;
    }
    const saveStr = await blob.text();

    const saveObj = JSON.parse(atob(saveStr)) as Save;
    loadSkills(saveObj);
    loadItems(saveObj);
    loadStatistics(saveObj);
    loadPlayer(saveObj);
}
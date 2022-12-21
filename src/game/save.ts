import localforage from 'localforage';
import type { CraftId } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { loadPlayer, savePlayer, setup as setupPlayer } from "./player";
import { loadEnemy, saveEnemy } from './enemy';
import { savePassives, loadPassives } from "./components/passives";
import { saveItems, loadItems } from "./components/items/items";
import { saveStatistics, loadStatistics } from "./statistics";
import { loadSkills, saveSkills } from "./skills/skills";

export interface Save {
    player?: {
        level: number;
        gold: number;
        curMana: number;
    },
    enemy?: {
        index: number;
        health: number;
        dummyDamage: number;
    },
    skills?: {
        attackSkillName: string;
        buffSkillNames?: string[];
    },
    passives?: {
        list: {index: number; desc: string}[]
    }
    items?: {
        items: {
            name: string;
            modList: { 
                values: number[];
                desc: ModDescription 
            }[];
        }[],
        craftPresets: { name: string, ids: CraftId[] }[]
    };
    statistics?: { name: string, value: number }[];
}


export async function save() {
    const saveObj: Save = {};
    [savePlayer, saveEnemy, saveSkills, savePassives, saveItems, saveStatistics].forEach(x => x(saveObj));

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
    [loadPlayer, loadEnemy, loadSkills, loadPassives, loadItems, loadStatistics].forEach(x => x(saveObj));

    setupPlayer();
}
import saveManager from '@src/utils/saveManager';
import type { CraftId, GConfig } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { loadPlayer, savePlayer, setup as setupPlayer } from "./player";
import { loadEnemy, saveEnemy } from './enemy';
import { saveComponents, loadComponents } from './components/loader';
import { loadSkills, saveSkills } from "./skills/skills";
import { loadStatistics, saveStatistics } from './statistics';

type SaveObject = { [K: string]: Save };

export interface Save {
    meta: {
        name: string;
        description?:string;
        rawUrl: string;
        id: string;
        createdAt: number;
        lastSavedAt: number;
    };
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
        list: { index: number; desc: string }[]
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

async function loadAsMap() {
    const blob = (await saveManager.load<SaveObject>('Game'));
    if (!blob) {
        return new Map<string, Save>();
    }
    return new Map(Object.entries(blob));
}

export async function saveGame(meta: Pick<GConfig['meta'], keyof Save['meta']>) {
    let map = await loadAsMap();

    const saveObj = map.get(meta.id) || {
        meta: { ...meta, lastSavedAt: Date.now() }
    };
    console.log(meta);
    [savePlayer, saveEnemy, saveSkills, saveStatistics,
        saveComponents].forEach(x => x(saveObj));

    map.set(meta.id, saveObj);

    saveManager.save('Game', Object.fromEntries(map));

    return true;
}

export async function loadGame(config: GConfig) {
    const id = config.meta.id;
    let map = await loadAsMap();
    const saveObj = map.get(id);
    if (!saveObj) {
        console.log('could not load', id);
        return false;
    }

    config.meta = { ...config.meta, ...saveObj.meta };

    [loadPlayer, loadEnemy, loadSkills, loadStatistics, loadComponents].forEach(x => x(saveObj));

    setupPlayer();
    return true;
}

export async function loadMostRecentSave() {
    try {
        const map = await loadAsMap();
        return [...map].map(x => x[1]).sort((a,b) => b.meta.lastSavedAt - a.meta.lastSavedAt)[0];
    } catch (e) {
        console.error(e);
    }
}
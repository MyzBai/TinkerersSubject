import saveManager from '@src/utils/saveManager';
import type { CraftId, GConfig } from "@src/types/gconfig"
import type { ModDescription } from "./mods";
import { loadPlayer, savePlayer, setup as setupPlayer } from "./player";
import { loadEnemy, saveEnemy } from './enemy';
import { saveComponents, loadComponents } from './components/loader';
import { loadSkills, saveSkills } from "./skills/skills";

type SaveObject = { [K: string]: Save };

export interface Save {
    meta: {
        url: string;
        name: string;
        id: string;
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
        meta: Object.assign({}, meta)
    };

    console.log('save meta', saveObj.meta);
    [savePlayer, saveEnemy, saveSkills,
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

    console.log('load meta', saveObj.meta);

    config.meta = { ...config.meta, ...saveObj.meta };

    [loadPlayer, loadEnemy, loadSkills, loadComponents].forEach(x => x(saveObj));

    setupPlayer();
    return true;
}
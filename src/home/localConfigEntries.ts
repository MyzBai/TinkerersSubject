
import type { Save } from '@src/game/save';
import type { ConfigEntry } from './configLoader';

interface AllSave {
    meta: undefined;
    list: Save[];
}

export function loadEntries() {
    //load saves
    const entries = [] as ConfigEntry[];
    //transform

    try {
        const text = localStorage.getItem('game-save');
        if (!text) {
            return entries;
        }
        const saveObj = JSON.parse(text) as AllSave;
        for (const save of saveObj.list) {
            if (!save.meta) {
                continue;
            }
            const { name, url } = save.meta;
            entries.push({ name, url });
        }
    } catch (e) {
        console.log(e);
    }

    return entries;
}
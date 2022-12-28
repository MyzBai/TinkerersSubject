
import type { Save } from '@src/game/saveGame';
import saveManager from '@src/utils/saveManager';
import type { ConfigEntry } from './configLoader';


export async function loadEntries() {
    //load saves
    const entries = [] as ConfigEntry[];
    //transform

    const blob = await saveManager.load('Game') as { [K: string]: Save };
    if (!blob) {
        return entries;
    }
    for (const save of Object.values(blob)) {
        const entry = { ...save.meta, type: 'load' };
        entries.push(entry);

    }

    return entries;
}
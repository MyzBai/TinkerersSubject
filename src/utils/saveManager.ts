import type GameSave from '@src/types/save/save';
import localforage from 'localforage';

type SaveType = 'Game';

export default { save, load }

export async function save(type: SaveType, object: Object) {
    try {
        switch (type) {
            case 'Game': return await saveBlob('ts-game', object);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function load(type: SaveType) {
    try {
        switch (type) {
            case 'Game':
                const blob = await loadBlob('ts-game') as { [K: string]: GameSave };
                if (blob) {
                    return new Map(Object.entries(blob));
                }
                return null;
            default: return null;
        }
    } catch (e) {
        console.error(e);
    }
}

async function saveBlob(key: string, object: Object) {
    const str = window.btoa(JSON.stringify(object));
    const blob = new Blob([str], { type: 'text/plain' });
    return await localforage.setItem<Blob>(key, blob);
}

async function loadBlob(key: string) {
    const blob = await localforage.getItem<Blob>(key);
    if (!blob) {
        return blob;
    }
    const str = await blob.text();
    return JSON.parse(window.atob(str)) as Object;
}
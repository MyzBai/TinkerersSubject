import localforage from 'localforage';

type SaveType = 'Game';

export default { save, load };

export async function save<T>(type: SaveType, object: object) {
    try {
        switch (type) {
        case 'Game': return await saveBlob('ts-game', object) as T;
        }
    } catch (e) {
        console.error(e);
    }
}

export async function load<T>(type: SaveType) {
    try {
        switch (type) {
        case 'Game':
        {
            const blob = await loadBlob('ts-game') as { [K: string]: T };
            if (blob) {
                return new Map(Object.entries(blob));
            }
            return null;
        }
        default: return null;
        }
    } catch (e) {
        console.error(e);
    }
}

async function saveBlob(key: string, object: object) {
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
    return JSON.parse(window.atob(str)) as object;
}
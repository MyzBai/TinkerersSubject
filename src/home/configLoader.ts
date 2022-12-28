import type GConfig from '@src/types/gconfig';
import * as remoteConfigEntries from './remoteConfigEntries';
import * as localConfigEntries from './savedConfigEntries';

export interface ConfigEntry {
    name: string;
    url: string;
    id?: string;
}

export async function loadRemoteConfigEntries() {
    return remoteConfigEntries.loadEntries();
}

export async function loadSavedConfigEntries() {
    return localConfigEntries.loadEntries();
}

export async function loadConfigAtUrl(url: string): Promise<GConfig | undefined> {
    const validUrl = remoteConfigEntries.validateRawUrl(url);
    if (!validUrl) {
        console.error('invalid url');
        return;
    }
    try {
        const json = await (await fetch(url)).json();
        return json as GConfig;
    } catch (e) {
        console.error(e);
    }
}

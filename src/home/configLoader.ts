import type GConfig from '@src/types/gconfig';
import * as remoteConfigEntries from './remoteConfigEntries';
import * as localConfigEntries from './localConfigEntries';

export interface ConfigEntry {
    name: string;
    url: string;
}

export async function loadRemoteConfigEntries() {
    return remoteConfigEntries.loadEntries();
}

export async function loadLocalConfigEntries() {
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

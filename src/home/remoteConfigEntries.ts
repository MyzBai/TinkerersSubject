import configList from '@public/gconfig/configList.json';
import type { ConfigEntry } from "./configEntryHandlers";

export async function loadEntries() {

    const entries = [] as ConfigEntry[];
    for (const item of configList.list) {
        const rawUrl = item.rawUrl;
        const valid = validateRawUrl(rawUrl);
        if (!valid) {
            continue;
        }
        entries.push({ name: item.name, url: item.rawUrl });
    }
    return entries;
}

export function validateRawUrl(url: string) {
    return /^https:\/\/raw\.githubusercontent\.com\/.+?(?=\.json)/.test(url);
}

// async function loadConfigFromURL(url: string) {
//     try {
//         const config = await (await fetch(url)).json();
//         if (typeof config === 'object') {
//             return config as GConfig;
//         }
//     } catch (e) {
//         console.error(e);
//     }
// }

// function validateConfig(config: GConfig) {
//     if (!validate(config)) {
//         console.log(ajv.errors);
//         return false;
//     }
//     return true;
// }

// function showConfig(name, description) {

// }


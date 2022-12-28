import type { ConfigEntry } from "./configEntryHandlers";

const configsReadmeUrl = 'https://raw.githubusercontent.com/TinkerersSubject/Configurations/main/README.md';
const fullRegexp = /<a.+?(?=<\/a>)<\/a>/g
const rawUrlRegexp = /data\-raw\=\"([^\"]*)/;
const nameRegexp = />(.+)<\/a>/

export async function loadEntries() {

    const text = await (await fetch(configsReadmeUrl)).text();
    const entries = [...text.matchAll(fullRegexp)].map(x => x[0]);
    const urls = [] as ConfigEntry[];
    for (const entry of entries) {
        const urlMatch = entry.match(rawUrlRegexp);
        const nameMatch = entry.match(nameRegexp);

        if (!urlMatch || !nameMatch) {
            continue;
        }
        const url = urlMatch[1];
        const name = nameMatch[1];
        const valid = validateRawUrl(url);
        if (valid) {
            urls.push({ url: url, name });
        }
    }

    return urls;
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


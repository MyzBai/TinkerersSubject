import { init as initGame } from './game/game';
import Ajv from 'ajv';
import { initTabs } from '@utils/helpers';
import type GConfig from '@src/types/gconfig';

const ajv = new Ajv();

declare global {
    var initTab: (btns: HTMLElement[], contents: HTMLElement[]) => void;
    var dev: { game: { playerStats } };
    var isLocal: boolean;
}
globalThis.initTabs = initTabs;
globalThis.isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

init();

async function init() {
    const schema = await (await fetch('public/gconfig/schema.json')).json();
    const module: GConfig = await (await fetch('public/gconfig/demo.json')).json();

    const valid = ajv.validate(schema, module);
    if (!valid) {
        console.error(ajv.errors);
        return;
    }
    // console.log('%c Module is valid', 'color: #10782b');

    await initGame(module);

    document.querySelector<HTMLElement>('.p-game menu li:nth-child(1)[data-tab-target]')?.click();

    document.body.classList.remove('hidden');
}
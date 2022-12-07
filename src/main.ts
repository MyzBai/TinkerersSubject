import { init as initGame } from './game/game';
import Ajv from 'ajv';
import { initTabs } from '@utils/helpers';
import GConfig from '../public/gconfig/schema';

const ajv = new Ajv();

declare global {
    var initTab: (btns: HTMLElement[], contents: HTMLElement[]) => void;
    var dev: { game: { playerStats } };
}
globalThis.initTabs = initTabs;


init();

async function init() {

    const schema = await (await fetch('../public/gconfig/schema.json')).json();
    const module: GConfig = await (await fetch('../public/gconfig/demo.json')).json();

    const valid = ajv.validate(schema, module);
    if (!valid) {
        console.error(ajv.errors);
        return;
    }
    console.log('%c Module is valid', 'color: #10782b');

    await initGame(module);

    document.querySelector<HTMLElement>('.p-game menu li:nth-child(1)[data-tab-target]')?.click();

    document.body.classList.remove('hidden');
}
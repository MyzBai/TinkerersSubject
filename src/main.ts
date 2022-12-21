import { init as initGame } from './game/game';
import Ajv from 'ajv';
import type GConfig from '@src/types/gconfig';

const ajv = new Ajv();

declare global{
    var TS: {
        game?: any
    }
}

globalThis.TS = {};

init();

async function init() {
    const schema = await (await fetch('public/gconfig/schema.json')).json();
    const module: GConfig = await (await fetch('public/gconfig/demo.json')).json();

    const valid = ajv.validate(schema, module);
    if (!valid) {
        console.error(ajv.errors);
        return;
    }

    await initGame(module);

    document.querySelector<HTMLElement>('.p-game menu li:nth-child(1)[data-tab-target]')?.click();

    document.body.classList.remove('hidden');
}
import GConfig, { ItemMod, Items } from '@src/types/gconfig';
import { Modifier } from '@game/mods';
import { templates, CraftId, CraftData } from './crafting';
import { playerStats, modDB } from '@game/player';
import { visibilityObserver } from '@utils/Observers';
import type { ModTemplate, Save } from '@src/game/save';
import { registerHighlightHTMLElement } from '@src/utils/helpers';

type ItemList = Items['itemList'];
type CraftList = Items['craftList'];

export type ModTables = { [K in keyof Items['modTables']]: ItemModifier[] }

//Elements
const itemsPage = document.querySelector('.p-game .p-items');
const itemsListContainer = itemsPage.querySelector<HTMLMenuElement>('menu[data-item-list]');
const itemModsContainer = itemsPage.querySelector<HTMLUListElement>('ul[data-mod-list]');
//Presets
const presetsContainer = itemsPage.querySelector<HTMLElement>('.s-preset-container');
const presetNewElement = presetsContainer.querySelector<HTMLElement>('[data-new]');
const presetEditElement = presetsContainer.querySelector<HTMLElement>('[data-edit]');
const presetModal2 = document.querySelector<HTMLElement>('.p-items [data-craft-preset-modal]');
const presetsModalCraftList = presetModal2.querySelector('[data-craft-list]');
//Crafting
const craftContainer = itemsPage.querySelector<HTMLElement>('.s-craft-container');
const craftListContainer = craftContainer.querySelector('[data-craft-list]');
const craftButton = craftContainer.querySelector('button[data-craft-button]');
const craftMessageElement = craftContainer.querySelector('[data-craft-message]');

//events
const itemsMenuButton = document.querySelector<HTMLElement>('.p-game > menu [data-tab-target="items"]');
const presetModal = document.querySelector('.p-items [data-preset-modal]') as HTMLDialogElement;

presetNewElement.addEventListener('click', () => { const newPreset = new Preset('New Preset'); newPreset.select(); newPreset.edit(); });
presetEditElement.addEventListener('click', () => Preset.active?.edit());

presetModal2.querySelector('footer [data-value="apply"]').addEventListener('click', () => Preset.active.apply());
presetModal2.querySelector('footer [data-value="delete"]').addEventListener('click', () => Preset.active.delete());

presetModal2.querySelector('footer [data-value="apply"]').addEventListener('click', () => { presetModal2.classList.add('hidden'); });
presetModal2.querySelector('footer [data-value="delete"]').addEventListener('click', () => { presetModal2.classList.add('hidden'); });
presetModal2.querySelector('footer [data-value="cancel"]').addEventListener('click', () => { presetModal2.classList.add('hidden'); });

craftButton.addEventListener('click', () => performCraft());

visibilityObserver(document.querySelector('.p-items'), () => { updateCraftList() });

let generalMods: ItemModifier[];
let items: Item[];
let crafts: Craft[];
let presets: Preset[];
let presetCrafts: Craft[];
let activeCraft: CraftList[number];

export function init(data: GConfig['items']) {

    generalMods = [];
    items = [];
    crafts = [];
    presets = [];
    presetCrafts = [];
    activeCraft = undefined;

    for (const modGroup of data.modTables.general) {
        for (let i = 0; i < modGroup.length; i++) {
            const itemMod = modGroup[i];
            generalMods.push(new ItemModifier(itemMod, modGroup));
        }
    }

    createItemList(data.itemList);
    createCrafts(data.craftList);
    createPresetModalCrafts();
    // createCraftListElements(data.craftList);
    // createPresetModalCraftListElements(data.craftList);

    new Preset('All', Object.keys(templates) as CraftId[]).select();
    new Preset('Reforge', ['reforge', 'reforgeIncludePhysical', 'reforgeIncludeMana', 'reforgeIncludeCritical']);
    items[0].element.click();


    playerStats.level.onChange.listen(level => {
        crafts.forEach(craft => craft.tryUnlock(level));
    });
    playerStats.gold.onChange.listen(updateCraftButton);


    if (data.levelReq > 1) {
        const id = playerStats.level.onChange.listen(level => {
            if (data.levelReq <= level) {
                playerStats.level.onChange.removeListener(id);
                itemsMenuButton.classList.remove('hidden');
                registerHighlightHTMLElement(itemsMenuButton, 'click');
            }
        });
    } else {
        itemsMenuButton.classList.remove('hidden');
    }
}

function setup() {
    presetModal2.classList.add('hidden');
    presetEditElement.classList.add('hidden');
    presets.forEach(x => x.delete());
}

function createItemList(itemList: ItemList) {
    for (const itemData of itemList) {
        const item = new Item(itemData);
        items.push(item);

        if (item.levelReq <= 1) {
            item.element.classList.remove('hidden');
            continue;
        }
        const id = playerStats.level.onChange.listen(level => {
            if (itemData.levelReq <= level) {
                item.element.classList.remove('hidden');
                registerHighlightHTMLElement(itemsMenuButton, 'click');
                registerHighlightHTMLElement(item.element, 'click');
                playerStats.level.onChange.removeListener(id);
            }
        });
    }
    document.querySelector('.p-items [data-item-list]')?.replaceChildren(...items.map(x => x.element));
}

function createCrafts(craftList: CraftList) {
    for (const craftData of craftList) {
        const craft = new Craft(craftData);
        crafts.push(craft);
        craft.element.addEventListener('click', () => {
            crafts.map(x => x.element).forEach(element => {
                element.classList.toggle('selected', element === craft.element);
            });
            activeCraft = craft;
            updateCraftButton();
        });
    }
    document.querySelector('.p-items .s-craft-container [data-craft-list]')?.replaceChildren(...crafts.map(x => x.element));
}

function createPresetModalCrafts() {
    const elements = crafts.map(x => x.element.cloneNode(true) as HTMLElement);
    elements.forEach(element => {
        element.addEventListener('click', () => {
            element.classList.toggle('selected', !element.classList.contains('selected'));
        });
    });
    presetsModalCraftList.replaceChildren(...elements);
}

function updateItemModList() {
    if (Item.active?.mods) {
        const elements: HTMLLIElement[] = [];
        for (const itemMod of Item.active.mods.sort(Modifier.sort)) {
            const desc = itemMod.desc;

            const element = document.createElement('li');
            element.classList.add('g-mod-desc');
            element.textContent = desc;
            elements.push(element);
        }
        document.querySelector('.p-items [data-mod-list]')?.replaceChildren(...elements);
    }

}

function updateCraftList() {
    if (!Preset.active)
        return;

    const ids = Preset.active.ids;
    const elements = document.querySelectorAll('.p-items .s-craft-container [data-craft-id]');
    elements.forEach(x => {
        const dataAttr = x.getAttribute('data-craft-id') as CraftId;
        const hide = !ids.includes(dataAttr);
        x.classList.toggle('hidden', hide);
        if (!hide) {
            const costElement = x.querySelector('i');
            const attr = costElement.getAttribute('data-cost');
            const cost = parseInt(attr);
            const canAfford = playerStats.gold.get() >= cost;
            costElement.toggleAttribute('data-insufficient-cost', !canAfford);
        }
    });
    const selectedVisibleElement = document.querySelector('.p-items .s-craft-container .selected[data-craft-id]:not(.hidden)');
    if (!selectedVisibleElement) {
        (document.querySelector('.p-items .s-craft-container [data-craft-id]:not(.hidden)') as HTMLElement)?.click();
    }
}

function createCraftData(): CraftData {
    return {
        itemModList: Item.active!.mods,
        modTables: {
            general: generalMods.filter(x => x.levelReq <= playerStats.level.get())
        }
    }
}

function updateCraftButton() {
    if (!Item.active || !templates[activeCraft.id]) {
        return;
    }

    let msg = '';

    const template = templates[activeCraft.id];
    if (!template) {
        console.error('invalid craft id');
        return;
    }
    if (playerStats.gold.get() < activeCraft.cost) {
        msg = 'You cannot afford this craft';
    }
    const craftData = createCraftData();
    const validator = template.validate(craftData);
    if (validator.errors.length > 0) {
        msg = validator.errors[0];
    }
    // document.querySelector('.p-items .s-craft-container [data-craft-message]')?.setAttribute('data-craft-message', msg);
    document.querySelector('.p-items .s-craft-container [data-craft-message]')!.textContent = msg;
    document.querySelector('.p-items .s-craft-container [data-craft-button]')!.toggleAttribute('disabled', msg.length > 0);
}

function performCraft() {
    if (!Item.active || !templates[activeCraft.id]) {
        return;
    }
    console.log('perform craft');

    const template = templates[activeCraft.id];

    const craftData = createCraftData();
    Item.active.mods = template.getItemMods(craftData);
    playerStats.gold.subtract(activeCraft.cost);

    updateItemModList();
}


class Item {
    static active?: Item;
    public readonly name: string;
    public readonly levelReq: number;
    public readonly element: HTMLElement;
    private sourceName: string;
    private _mods: ItemModifier[];
    constructor({ name, levelReq }: { name: string, levelReq: number }) {
        this.name = name;
        this.levelReq = levelReq;
        this._mods = [] as ItemModifier[];
        this.element = this.createElement();
        this.sourceName = `Skills/${name}`;
    }

    get mods() { return this._mods; }
    set mods(v: ItemModifier[]) {
        modDB.removeBySource(this.sourceName);
        this._mods = v;
        modDB.add(this.mods.flatMap(x => x.stats), this.sourceName);
    }

    private createElement() {
        const element = document.createElement('li');
        element.classList.add('g-list-item', 'item', 'hidden');
        element.textContent = this.name;
        element.addEventListener('click', () => {
            Item.active = this;
            document.querySelectorAll('.p-items [data-item-list] .item').forEach(x => {
                x.classList.toggle('selected', x === element);
            });
            updateItemModList();
            updateCraftButton();
        });
        return element;
    }
}

export class ItemModifier extends Modifier {
    private readonly itemModData: ItemMod;
    public readonly levelReq: number;
    public weight: number;
    private readonly groupIndex: number;
    private readonly modGroup: ItemMod[];
    constructor(itemModData: ItemMod, modGroup: ItemMod[]) {
        super(itemModData.mod);
        this.itemModData = itemModData;
        this.levelReq = itemModData.levelReq;
        this.weight = itemModData.weight;
        this.groupIndex = modGroup.findIndex(x => x === itemModData);
        this.modGroup = modGroup;
    }
    get tier() {
        const count = this.modGroup.filter(x => x.levelReq <= playerStats.level.get()).length - 1;
        return Math.max(1, count - this.groupIndex);
    }

    copy(): ItemModifier {
        return new ItemModifier(this.itemModData, this.modGroup);
    }
}

class Craft {
    readonly id: CraftId;
    readonly levelReq: number;
    readonly cost: number;
    readonly element: HTMLElement;
    constructor(craftData: GConfig['items']['craftList'][number]) {
        Object.assign(this, craftData);
        this.element = this.createElement();
    }

    tryUnlock(level: number) {
        if (level >= this.levelReq) {
            this.element.classList.remove('hidden');
        }
    }

    private createElement() {
        const element = document.createElement('li');
        element.classList.add('g-field', 'g-list-item', 'hidden');
        const desc = templates[this.id].desc.replace(/\[\w+\]/g, (x) => {
            return `<span>${x.substring(1, x.length - 1)}</span>`;
        });
        element.insertAdjacentHTML('beforeend', `<div>${desc}</div>`);
        element.insertAdjacentHTML('beforeend', `<i data-cost="${this.cost}">${this.cost}</i>`);
        element.setAttribute('data-craft-id', this.id);
        return element;
    }
}

class Preset {
    static active: Preset | null;
    public name: string;
    public ids: CraftId[];
    private readonly element: HTMLElement; //preset button
    constructor(name: string, defaultIds: CraftId[] = []) {
        this.name = name;
        this.ids = [...defaultIds];
        this.element = this.createElement();
        this.setName(this.name);

        presets.push(this);
    }

    static create() {
        return new Preset('New Preset', []);
    }

    select() {
        this.element.click();
        presetEditElement.classList.remove('hidden');
    }

    setName(name: string) {
        this.name = name.replace(/[^A-Za-z 0-9]/g, '');
        this.element.textContent = this.name;
    }

    edit() {
        this.openModal();
    }

    delete() {
        Preset.active = null;
        if (this.element.previousElementSibling) {
            (this.element.previousElementSibling as HTMLElement)?.click();
        } else {
            (this.element.nextElementSibling as HTMLElement)?.click();
        }
        this.element.remove();
        presets = presets.filter(x => x !== this);
        updateCraftList();
    }

    apply() {
        this.setName((presetModal.querySelector('[data-name]') as HTMLInputElement).value);
        this.ids = Array.from(presetModal.querySelectorAll('[data-craft-list] [data-craft-id].selected')).map(x => x.getAttribute('data-craft-id')) as CraftId[];
        updateCraftList();
    }

    private createElement() {
        const element = document.createElement('li');
        element.classList.add('g-list-item', 'preset');
        element.addEventListener('click', () => {
            Preset.active = this;
            document.querySelectorAll('.p-items [data-preset-list] li').forEach(x => {
                x.classList.toggle('selected', x === element);
            });
            updateCraftList();
        });
        document.querySelector('.p-items [data-preset-list]')?.appendChild(element);
        return element;
    }

    private openModal() {
        (presetModal2.querySelector('input[data-name]') as HTMLInputElement).value = this.name;
        presetModal2.querySelectorAll('[data-craft-list] [data-craft-id]').forEach(element => {
            const id = element.getAttribute('data-craft-id');
            const craft = crafts.find(x => x.id === id);
            const hidden = playerStats.level.get() < craft.levelReq;
            element.classList.toggle('hidden', hidden);
            element.classList.toggle('selected', !hidden && this.ids.includes(craft.id));
        });
        presetModal2.classList.remove('hidden');
    }
}

export function saveItems(saveObj: Save) {
    const createItemModListData: (item: Item) => ModTemplate[] = (item) => item.mods.map(mod => { return { desc: mod.templateDesc, values: mod.stats.map(x => x.value) } });
    saveObj.items = {
        items: items.map(item => { return { name: item.name, modList: createItemModListData(item) } }),
        craftPresets: presets.map(x => { return { name: x.name, ids: x.ids } })
    }
}

export function loadItems(saveObj: Save) {
    setup();

    for (const itemData of saveObj.items.items) {
        const item = items.find(x => x.name === itemData.name);
        if (!item) {
            console.error('Invalid item name', itemData.name);
            continue;
        }
        item.mods = itemData.modList.map(mod => {
            const itemModifier = generalMods.find(y => mod.desc === y.templateDesc)?.copy();
            itemModifier.stats.forEach((stat, i) => stat.value = mod.values[i]);
            return itemModifier;
        });
    }

    for (const preset of saveObj.items.craftPresets) {
        new Preset(preset.name, preset.ids);
    }

    presets[0]?.select();
    items[0]?.element.click();
}
import GConfig, { ItemMod, Items } from '@src/types/gconfig';
import { Modifier } from '@game/mods';
import { templates, CraftId, CraftData } from './crafting';
import { playerStats, modDB } from '@game/player';
import { visibilityObserver } from '@utils/Observers';
import type { ModTemplate, Save } from '@src/game/save';
import { highlightHTMLElement } from '@src/utils/helpers';

type ItemList = Items['itemList'];
type CraftList = Items['craftList'];

export type ModTables = { [K in keyof Items['modTables']]: ItemModifier[] }

//Elements
const itemsPage = document.querySelector('.p-game .p-items');
//Presets
const presetsContainer = itemsPage.querySelector<HTMLElement>('.s-preset-container');
const presetNewElement = presetsContainer.querySelector<HTMLElement>('[data-new]');
const presetEditElement = presetsContainer.querySelector<HTMLElement>('[data-edit]');
const presetModal = document.querySelector<HTMLElement>('.p-items [data-craft-preset-modal]');
const presetsModalCraftList = presetModal.querySelector('[data-craft-list]');
// const presetModalRemoveButton = presetModal2.querySelector('button[data-value="remove"]');
//Crafting
const craftContainer = itemsPage.querySelector<HTMLElement>('.s-craft-container');
const craftButton = craftContainer.querySelector('button[data-craft-button]');

//events
const itemsMenuButton = document.querySelector<HTMLElement>('.p-game > menu [data-tab-target="items"]');
presetNewElement.addEventListener('click', () => { const newPreset = new Preset('New Preset'); newPreset.select(); newPreset.edit(); });
presetEditElement.addEventListener('click', () => Preset.active?.edit());

presetModal.querySelector('footer [data-value="apply"]').addEventListener('click', () => Preset.active.apply());
presetModal.querySelector('footer [data-value="delete"]').addEventListener('click', () => Preset.active.delete());

presetModal.querySelector('footer [data-value="apply"]').addEventListener('click', () => { presetModal.classList.add('hidden'); });
presetModal.querySelector('footer [data-value="delete"]').addEventListener('click', () => { presetModal.classList.add('hidden'); });
presetModal.querySelector('footer [data-value="cancel"]').addEventListener('click', () => { presetModal.classList.add('hidden'); });

craftButton.addEventListener('click', () => performCraft());

visibilityObserver(document.querySelector('.p-items'), () => { updateCraftList() });

const getFilteredCraftIds = () => crafts.filter(x => x.levelReq <= playerStats.level.get()).map(x => x.id);

let generalMods: ItemModifier[];
let items: Item[];
let crafts: Craft[];
let presets: Preset[];

export function init(data: GConfig['items']) {

    generalMods = [];
    items = [];
    crafts = [];
    presets = [];

    for (const modGroup of data.modTables.general) {
        for (let i = 0; i < modGroup.length; i++) {
            const itemMod = modGroup[i];
            generalMods.push(new ItemModifier(itemMod, modGroup));
        }
    }

    createItemList(data.itemList);
    createCrafts(data.craftList);
    createDefaultPreset();
    createPresetModalCrafts();

    items[0].element.click();

    playerStats.level.onChange.listen(level => {
        crafts.forEach(craft => craft.tryUnlock(level));
    });
    playerStats.gold.onChange.listen(() => {
        updateCraftList();
        updateCraftButton();
    });

    if (data.levelReq > 1) {
        const id = playerStats.level.onChange.listen(level => {
            if (data.levelReq <= level) {
                playerStats.level.onChange.removeListener(id);
                itemsMenuButton.classList.remove('hidden');
                highlightHTMLElement(itemsMenuButton, 'mouseover');
            }
        });
    } else {
        itemsMenuButton.classList.remove('hidden');
    }
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
                highlightHTMLElement(itemsMenuButton, 'click');
                highlightHTMLElement(item.element, 'mouseover');
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
            craft.select();
            updateCraftButton();
        });
    }
    document.querySelector('.p-items .s-craft-container [data-craft-list]')?.replaceChildren(...crafts.map(x => x.element));
    crafts.find(x => !x.locked).select();
}

function createDefaultPreset() {
    const preset = new Preset('All', Object.keys(templates) as CraftId[], true);
    preset.select();
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

    const filteredIds = getFilteredCraftIds();
    const ids = Preset.active.ids.filter(x => filteredIds.includes(x));
    crafts.forEach(craft => {
        const canAfford = craft.cost <= playerStats.gold.get();
        const costElement = craft.element.querySelector('[data-cost]');
        costElement.toggleAttribute('data-insufficient-cost', !canAfford);
        craft.element.classList.toggle('hidden', craft.locked || !ids.includes(craft.id));
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
    if (!Item.active) {
        return;
    }

    let msg = '';

    const template = templates[Craft.active.id];
    if (!template) {
        console.error('invalid craft id');
        return;
    }
    if (playerStats.gold.get() < Craft.active.cost) {
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
    if (!Item.active || !templates[Craft.active.id]) {
        return;
    }

    const template = templates[Craft.active.id];
    const craftData = createCraftData();
    Item.active.mods = template.getItemMods(craftData);
    playerStats.gold.subtract(Craft.active.cost);

    updateItemModList();
    updateCraftList();
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
    static active: Craft;
    readonly id: CraftId;
    readonly levelReq: number;
    readonly cost: number;
    readonly element: HTMLElement;
    private _locked = true;
    constructor(craftData: GConfig['items']['craftList'][number]) {
        Object.assign(this, craftData);
        this.element = this.createElement();
        this._locked = this.levelReq > 1;
    }

    get locked() { return this._locked; }

    tryUnlock(level: number) {
        if (this.locked && level >= this.levelReq) {
            highlightHTMLElement(itemsMenuButton, 'click');
            highlightHTMLElement(Preset.default.element, 'click');
            highlightHTMLElement(this.element, 'mouseover');
            updateCraftList();
            this._locked = false;
        }
    }

    select() {
        Craft.active = this;
        this.element.click();
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
    static default: Preset;
    public name: string;
    public ids: CraftId[];
    public readonly element: HTMLElement; //preset button
    constructor(name: string, ids: CraftId[] = [], isDefault = false) {
        this.name = name;
        this.ids = [...ids];
        if (isDefault) {
            Preset.default = this;
        }
        this.element = this.createElement();
        this.setName(this.name);
        presets.push(this);
    }

    get isDefault() { return Preset.default === this; }

    static create() {
        return new Preset('New Preset', []);
    }

    select() {
        this.element.click();
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
        const name = presetModal.querySelector<HTMLInputElement>('input[data-name]').value;
        this.setName(name);
        const selectedElements = presetModal.querySelectorAll('[data-craft-list] [data-craft-id].selected');
        this.ids = Array.from(selectedElements).map(x => x.getAttribute('data-craft-id')) as CraftId[];
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
            presetEditElement.toggleAttribute('disabled', this.isDefault);
            updateCraftList();
        });
        document.querySelector('.p-items [data-preset-list]')?.appendChild(element);
        return element;
    }

    private openModal() {
        (presetModal.querySelector('input[data-name]') as HTMLInputElement).value = this.name;
        const filteredIds = getFilteredCraftIds();
        presetModal.querySelectorAll('[data-craft-list] [data-craft-id]').forEach(element => {
            const id = element.getAttribute('data-craft-id') as CraftId;
            const hidden = !filteredIds.includes(id);
            element.classList.toggle('hidden', hidden);
            const selected = !hidden && this.ids.includes(id);
            element.classList.toggle('selected', selected);
        });
        presetModal.classList.remove('hidden');
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

    presets.forEach(x => x.delete());

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
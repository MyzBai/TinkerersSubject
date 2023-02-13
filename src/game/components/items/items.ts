import type { GConfig, ItemMod, Items } from '@src/types/gconfig';
import { Modifier } from '@game/mods';
import { craftTemplates, CraftId, CraftData } from './crafting';
import { playerStats, modDB } from '@game/player';
import { visibilityObserver } from '@utils/Observers';
import type { Save } from '@src/game/saveGame';
import { highlightHTMLElement, queryHTML } from '@src/utils/helpers';

type ItemList = Items['itemList'];
type CraftList = Items['craftList'];

export type ModTables = { [K in keyof Items['modTables']]: ItemModifier[] }

//Elements
const itemsPage = queryHTML('.p-game .p-items');
const itemListContainer = queryHTML('menu[data-item-list]', itemsPage);
const modListContainer = queryHTML('ul[data-mod-list]', itemsPage);
//Presets
const presetsContainer = queryHTML('.s-preset-container', itemsPage);
const presetNewElement = queryHTML('[data-new]', presetsContainer);
const presetEditElement = queryHTML('[data-edit]', presetsContainer);
const presetListContainer = queryHTML('[data-preset-list]', presetsContainer);
const presetModal = queryHTML('[data-craft-preset-modal]', itemsPage);
const presetsModalCraftList = queryHTML('[data-craft-list]', presetModal);
// const presetModalRemoveButton = presetModal2.querySelector('button[data-value="remove"]');
//Crafting
const craftContainer = queryHTML('.s-craft-container', itemsPage);
const craftButton = queryHTML('button[data-craft-button]', craftContainer);

//events
const itemsMenuButton = queryHTML('.p-game > menu [data-tab-target="items"]');
presetNewElement.addEventListener('click', () => { const preset = createNewPreset('New Preset', []); preset.edit(); });
presetEditElement.addEventListener('click', () => Preset.active?.edit());

queryHTML('footer [data-value="apply"]', presetModal).addEventListener('click', () => Preset.active?.apply());
queryHTML('footer [data-value="delete"]', presetModal).addEventListener('click', () => Preset.active?.delete());

queryHTML('footer [data-value="apply"]', presetModal).addEventListener('click', () => { presetModal.classList.add('hidden'); });
queryHTML('footer [data-value="delete"]', presetModal).addEventListener('click', () => { presetModal.classList.add('hidden'); });
queryHTML('footer [data-value="cancel"]', presetModal).addEventListener('click', () => { presetModal.classList.add('hidden'); });

craftButton.addEventListener('click', () => performCraft());

visibilityObserver(itemsPage, () => { updateCraftList() });

const getFilteredCraftIds = () => crafts.filter(x => x.levelReq <= playerStats.level.get()).map(x => x.id);

let generalMods: ItemModifier[];
let items: Item[];
let crafts: Craft[];
let presets: Preset[];


export function init(data: GConfig['items']) {
    if(!data){
        return;
    }
    generalMods = [];
    items = [];
    crafts = [];

    presets?.forEach(x => x.delete());
    presets = [];

    if (!data) {
        return;
    }

    for (const modGroup of data.modTables.general) {
        for (let i = 0; i < modGroup.length; i++) {
            const itemMod = modGroup[i];
            generalMods.push(new ItemModifier(itemMod, modGroup));
        }
    }

    createItemList(data.itemList);
    createCrafts(data.craftList);

    createNewPreset('All', Object.keys(craftTemplates) as CraftId[], true);

    createPresetModalCrafts();

    items[0].element.click();

    playerStats.level.addListener('add', (level: number) => crafts.forEach(craft => craft.tryUnlock(level)));
    playerStats.gold.addListener('change', () => {
        updateCraftList();
        updateCraftButton();
    });

    if (data.levelReq > 1) {
        const listener = (level: number) => {
            if (data.levelReq <= level) {
                playerStats.level.removeListener('change', listener);
                itemsMenuButton.classList.remove('hidden');
                highlightHTMLElement(itemsMenuButton, 'mouseover');
            }
        }
        playerStats.level.addListener('change', listener);
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
        const listener = (level: number) => {
            if (itemData.levelReq <= level) {
                item.element.classList.remove('hidden');
                highlightHTMLElement(itemsMenuButton, 'click');
                highlightHTMLElement(item.element, 'mouseover');
                playerStats.level.removeListener('change', listener);
            }
        }
        playerStats.level.addListener('change', listener);
    }
    itemListContainer.replaceChildren(...items.map(x => x.element));
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
    queryHTML('[data-craft-list]', craftContainer).replaceChildren(...crafts.map(x => x.element));
    crafts.find(x => !x.locked)?.select();
}

function createNewPreset(name: string, ids: CraftId[], isDefault = false) {
    const preset = new Preset(name, ids, isDefault);
    presetListContainer.appendChild(preset.element);
    preset.select();
    return preset;
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
        modListContainer.replaceChildren(...elements);
    }

}

function updateCraftList() {
    if (!Preset.active)
        return;

    const filteredIds = getFilteredCraftIds();
    const ids = Preset.active.ids.filter(x => filteredIds.includes(x));
    crafts.forEach(craft => {
        const canAfford = craft.cost <= playerStats.gold.get();
        const costElement = queryHTML('[data-cost]', craft.element);
        costElement?.toggleAttribute('data-insufficient-cost', !canAfford);
        craft.element.classList.toggle('hidden', craft.locked || !ids.includes(craft.id));
    });
    const selectedVisibleElement = craftContainer.querySelector('[data-craft-id].selected:not(.hidden)');
    if (!selectedVisibleElement) {
        craftContainer.querySelector<HTMLElement>('[data-craft-id]:not(.hidden)')?.click();
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

    const template = craftTemplates[Craft.active.id];
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
    queryHTML('[data-craft-message]', craftContainer).textContent = msg;
    queryHTML('[data-craft-button]', craftContainer).toggleAttribute('disabled', msg.length > 0);
}

function performCraft() {
    if (!Item.active || !craftTemplates[Craft.active.id]) {
        return;
    }

    const template = craftTemplates[Craft.active.id];
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
        element.classList.add('g-list-item', 'hidden');
        element.textContent = this.name;
        element.addEventListener('click', () => {
            Item.active = this;
            itemListContainer.querySelectorAll('li').forEach(x => {
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
    constructor(data: NonNullable<GConfig['items']>['craftList'][number]) {
        this.id = data.id;
        this.levelReq = data.levelReq;
        this.cost = data.cost;
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
        const desc = craftTemplates[this.id].desc.replace(/\[\w+\]/g, (x) => {
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
        const name = queryHTML<HTMLInputElement>('input[data-name]', presetModal).value;
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
            presetListContainer.querySelectorAll('li').forEach(x => {
                x.classList.toggle('selected', x === element);
            });
            presetEditElement.toggleAttribute('disabled', this.isDefault);
            updateCraftList();
        });
        presetListContainer.appendChild(element);
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
    saveObj.items = {
        items: items.map(item => <NonNullable<Save['items']>['items'][number]>({
            name: item.name,
            modList: item.mods.map(mod => ({
                desc: mod.templateDesc,
                values: mod.stats.map(stat => stat.value)
            })),
        })),
        craftPresets: presets.filter(x => !x.isDefault).map(x => ({ name: x.name, ids: x.ids }))
    }
}

export function loadItems(saveObj: Save) {

    if (!saveObj.items) {
        return;
    }
    presets.filter(x => !x.isDefault).forEach(x => x.delete());

    for (const itemData of saveObj.items.items) {
        const item = items.find(x => x.name === itemData.name);
        if (!item) {
            console.warn('Could not load Item with name: ', itemData.name);
            continue;
        }
        const mods = [] as ItemModifier[];
        for (const itemMod of itemData.modList) {
            const itemModifier = generalMods.find(x => itemMod.desc === x.templateDesc)?.copy();
            if (!itemModifier) {
                continue;
            }
            const success = itemModifier.setStatValues(itemMod.values);
            if (!success) {
                continue;
            }
            mods.push(itemModifier);
        }
        item.mods = mods;
    }

    for (const preset of saveObj.items.craftPresets) {
        new Preset(preset.name, preset.ids);
    }

    presets[0]?.select();
    items[0]?.element.click();
}
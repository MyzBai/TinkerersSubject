import { ItemMod, Items } from '@src/types/gconfig';
import { Modifier } from '@game/mods';
import { templates, CraftId, CraftData } from './crafting';
import { playerStats, modDB } from '@game/player';
import { visibilityObserver } from '@utils/Observers';

type CraftList = Items['craftList'];

export type ModTables = { [K in keyof Items['modTables']]: ItemModifier[] }

document.querySelector('.p-items .s-craft-container [data-craft-button]')!.addEventListener('click', performCraft);

document.querySelector('.p-items .s-preset-container [data-new]')!.addEventListener('click', () => {
    const newPreset = new CraftPreset('New Preset', []);
    newPreset.select();
    newPreset.edit();
});
document.querySelector('.p-items .s-preset-container [data-edit]')!.addEventListener('click', () => {
    CraftPreset.active?.edit();
});
document.querySelector('.p-items .s-preset-container [data-remove]')!.addEventListener('click', () => {
    CraftPreset.active?.delete();
});

const presetModal: HTMLDialogElement = document.querySelector('.p-items [data-preset-modal]') as HTMLDialogElement;
presetModal.querySelector('input[type="submit"]')?.addEventListener('click', () => CraftPreset.active?.apply());
const generalMods: ItemModifier[] = [];
// let advancedModDescription = false;

const activeCraftData: { cost: number, id: CraftId } = {
    cost: 0, id: 'reforge'
}

visibilityObserver(document.querySelector('.p-items'), x => { updateCraftList() })

export async function init(data: Items) {

    for (const modGroup of data.modTables.general) {
        for (let i = 0; i < modGroup.length; i++) {
            const itemMod = modGroup[i];
            generalMods.push(new ItemModifier(itemMod, modGroup))
        }
    }

    //TODO::check if items[n].name contains data.itemList[n].name
    //if so, setup item values, else create a new item

    const items: Item[] = [];
    for (const itemData of data.itemList) {
        const item = new Item(itemData);
        items.push(item);

        const isLocked = () => playerStats.level.get() < item.levelReq;
        if (isLocked()) {
            const id = playerStats.level.onChange.listen(level => {
                if (!isLocked()) {
                    item.unlock();
                    playerStats.level.onChange.removeListener(id);
                }
            });
        }
        item.element.classList.toggle('hidden', isLocked());
    }
    document.querySelector('.p-items [data-item-list]')?.replaceChildren(...items.map(x => x.element));

    createCraftListElements(data.craftList);
    createPresetModalCraftListElements(data.craftList);

    new CraftPreset('All', Object.keys(templates) as CraftId[]).select();
    new CraftPreset('Reforge', ['reforge', 'reforgeIncludePhysical', 'reforgeIncludeMana', 'reforgeIncludeCritical']);
    items[0].element.click();

    playerStats.gold.onChange.listen(updateCraftButton);
}

function createCraftListElements(craftList: CraftList) {
    const elements = createCraftElements(craftList);
    elements.forEach(x => {
        x.addEventListener('click', () => {
            elements.forEach(y => {
                y.classList.toggle('selected', y === x);
            });
            const id = x.getAttribute('data-craft-id') as CraftId;
            activeCraftData.id = id;
            activeCraftData.cost = craftList.find(x => x.id === id)!.cost;
            updateCraftButton();
        });
    });
    updateCraftList();
    playerStats.gold.onChange.listen(x => {
        if (document.querySelector('.p-items').classList.contains('hidden')) {
            return;
        }
        updateCraftList();
    });
    document.querySelector('.p-items .s-craft-container [data-craft-list]')?.replaceChildren(...elements);
}

function createPresetModalCraftListElements(craftList: CraftList) {
    const elements = createCraftElements(craftList);
    elements.forEach(x => {
        x.addEventListener('click', () => {
            x.classList.toggle('selected', !x.classList.contains('selected'));
        });
    });
    document.querySelector('.p-items [data-preset-modal] [data-craft-list]')?.replaceChildren(...elements);
}

function createCraftElements(craftList: CraftList) {
    const elements: HTMLLIElement[] = [];
    for (const craft of craftList) {
        const element = document.createElement('li');
        element.classList.add('g-field', 'g-list-item');
        const desc = templates[craft.id].desc.replace(/\[\w+\]/g, (x) => {
            return `<span>${x.substring(1, x.length - 1)}</span>`;
        });
        element.insertAdjacentHTML('beforeend', `<div>${desc}</div>`);
        element.insertAdjacentHTML('beforeend', `<i data-cost="${craft.cost}">${craft.cost}</i>`);
        element.setAttribute('data-craft-id', craft.id);
        elements.push(element);
    }
    return elements;
}

function updateItemModList() {
    if (Item.active?.mods) {
        const elements: HTMLLIElement[] = [];
        for (const itemMod of Item.active.mods.sort(Modifier.compare)) {
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
    if (!CraftPreset.active)
        return;

    const ids = CraftPreset.active.ids;
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
    if (!Item.active || !templates[activeCraftData.id]) {
        return;
    }

    let msg = '';

    const template = templates[activeCraftData.id];
    if (!template) {
        console.error('invalid craft id');
        return;
    }
    if (playerStats.gold.get() < activeCraftData.cost) {
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
    if (!Item.active || !templates[activeCraftData.id]) {
        return;
    }
    console.log('perform craft');

    const template = templates[activeCraftData.id];

    const craftData = createCraftData();
    Item.active.mods = template.getItemMods(craftData);
    playerStats.gold.subtract(activeCraftData.cost);

    updateItemModList();
}


class Item {
    static active?: Item;
    #name: string;
    #levelReq: number;
    #mods: ItemModifier[];
    #element: HTMLElement;
    #sourceName: string;
    constructor({ name, levelReq }: { name: string, levelReq: number }) {
        this.#name = name;
        this.#levelReq = levelReq;
        this.#mods = [];
        this.#element = this.#createElement();
        this.#sourceName = `Skills/${name}`;
    }

    get name() { return this.#name; }
    get levelReq() { return this.#levelReq; }
    get mods() { return [...this.#mods]; }
    set mods(v: ItemModifier[]) {
        modDB.removeBySource(this.#sourceName);
        this.#mods = v;
        modDB.add(this.#mods.flatMap(x => x.stats), this.#sourceName);
    }
    get element() { return this.#element; }

    unlock() {
        this.element.classList.remove('hidden');
    }

    #createElement() {
        const element = document.createElement('li');
        element.classList.add('g-list-item', 'item');
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
    #itemModData: ItemMod;
    #levelReq: number;
    #weight: number;
    #groupIndex: number;
    #modGroup: ItemMod[];
    constructor(itemModData: ItemMod, modGroup: ItemMod[]) {
        super(itemModData.mod);
        this.#itemModData = itemModData;
        this.#levelReq = itemModData.levelReq;
        this.#weight = itemModData.weight;
        this.#groupIndex = modGroup.findIndex(x => x === itemModData);
        this.#modGroup = modGroup;
    }
    get levelReq() { return this.#levelReq; }
    get weight() { return this.#weight; }
    set weight(v) { this.#weight = v; }
    get tier() {
        const count = this.#modGroup.filter(x => x.levelReq <= playerStats.level.get()).length - 1;
        return Math.max(1, count - this.#groupIndex);
    }

    copy(): ItemModifier {
        return new ItemModifier(this.#itemModData, this.#modGroup);
    }
}

class CraftPreset {
    static active: CraftPreset | null;
    #name: string;
    #ids: CraftId[];
    #element: HTMLElement; //preset button

    constructor(name: string, defaultIds: CraftId[] = []) {
        this.#name = name;
        this.#ids = [...defaultIds];
        this.#element = this.#createElement();
        this.setName(this.name);
    }
    get name() { return this.#name; }
    get ids() { return this.#ids; }

    select() {
        this.#element.click();
    }

    setName(name: string) {
        this.#name = name.replace(/[^A-Za-z 0-9]/g, '');
        this.#element.textContent = this.name;
    }

    edit() {

        this.#openModal();
    }

    delete() {
        CraftPreset.active = null;
        if (this.#element.previousElementSibling) {
            (this.#element.previousElementSibling as HTMLElement)?.click();
        } else {
            (this.#element.nextElementSibling as HTMLElement)?.click();
        }
        this.#element.remove();
        updateCraftList();
    }

    apply() {
        this.setName((presetModal.querySelector('[data-name]') as HTMLInputElement).value);
        this.#ids = Array.from(presetModal.querySelectorAll('[data-craft-list] [data-craft-id].selected')).map(x => x.getAttribute('data-craft-id')) as CraftId[];
        updateCraftList();
    }

    #createElement() {
        const element = document.createElement('li');
        element.classList.add('g-list-item', 'preset');
        element.addEventListener('click', () => {
            CraftPreset.active = this;
            document.querySelectorAll('.p-items [data-preset-list] li').forEach(x => {
                x.classList.toggle('selected', x === element);
            });
            updateCraftList();
        });
        document.querySelector('.p-items [data-preset-list]')?.appendChild(element);
        return element;
    }

    #openModal() {
        (presetModal.querySelector('input[data-name]') as HTMLInputElement).value = this.#name;
        presetModal.querySelectorAll('[data-craft-list] [data-craft-id]').forEach(x => {
            x.classList.toggle('selected', this.ids.includes(x.getAttribute('data-craft-id') as CraftId));
        });
        presetModal.showModal();

    }

    #closeModal(apply: boolean) {
        presetModal.close();
    }
}
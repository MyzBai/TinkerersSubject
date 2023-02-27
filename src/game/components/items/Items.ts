import Component from "@src/game/components/Component";
import type Game from "@src/game/Game";
import { Modifier } from "@src/game/mods";
import type { CraftId, ItemMod } from "@src/types/gconfig";
import type GConfig from "@src/types/gconfig";
import type { Save } from "@src/types/save";
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import { CraftData, craftTemplates } from "./crafting";
import CraftPresets from "./CraftPresets";

type ItemsData = Required<Required<GConfig>['components']>['items'];
type CraftDataList = ItemsData['craftList'];
export type ModTables = { [K in keyof ItemsData['modLists']]: ItemModifier[] }

export default class Items extends Component {
    private readonly itemsPage = querySelector('.p-game .p-items');
    private readonly itemListContainer = querySelector('[data-item-list]', this.itemsPage);
    private readonly itemModListContainer = querySelector('[data-mod-list]', this.itemsPage);
    private readonly itemCraftTableContainer = querySelector('.s-craft-container [data-craft-list] table', this.itemsPage);
    private readonly craftButton = querySelector<HTMLButtonElement>('.s-craft-container [data-craft-button]', this.itemsPage);
    private readonly craftMessageElement = querySelector<HTMLButtonElement>('[data-craft-message]', this.itemsPage);
    readonly items: Item[] = [];
    private activeItem: Item;
    private activeCraftId?: CraftId;
    readonly modLists: ItemModifier[];
    private presets: CraftPresets;
    constructor(readonly game: Game, readonly data: ItemsData) {
        super(game, 'items');
        this.presets = new CraftPresets(this);
        this.modLists = data.modLists.flatMap(group => group.map(mod => new ItemModifier(mod, group)));


        if (data.itemList.length === 0 || data.itemList.sort((a, b) => a.levelReq - b.levelReq)[0]!.levelReq > data.levelReq) {
            throw Error('No items available! There must be at least 1 item available');
        }
        this.createItems();
        this.activeItem = this.items[0]!;
        this.activeItem.element.click();


        this.createCraftListItems(data.craftList);
        this.updateCraftList(this.presets.activePreset?.ids);

        this.game.player.stats.gold.addListener('change', () => {
            if (this.page.classList.contains('hidden')) {
                return;
            }
            if (this.activeCraftId) {
                this.updateCraftButton();
            }
        });

        game.player.stats.level.addListener('change', () => this.updateCraftList(this.presets.activePreset?.ids));
        this.craftButton.addEventListener('click', () => this.performCraft());
    }

    save(saveObj: Save) {
        saveObj.items = {
            items: this.items.map<Required<Save>['items']['items'][number]>(item => ({
                name: item.name,
                modList: item.mods.map(mod => ({
                    text: mod.text,
                    values: mod.stats.map(x => x.value)
                }))
            })),
            craftPresets: this.presets.presets.map(preset => ({
                name: preset.name,
                ids: preset.ids
            }))
        }
    }

    selectItem(item: Item) {
        this.activeItem = item;
        this.updateItemModList();
        this.updateCraftButton();
    }

    private updateItemModList() {
        const elements: HTMLLIElement[] = [];
        for (const itemMod of this.activeItem.mods.sort(Modifier.sort)) {
            const desc = itemMod.desc;

            const element = document.createElement('li');
            element.classList.add('g-mod-desc');
            element.textContent = desc;
            elements.push(element);
        }
        this.itemModListContainer.replaceChildren(...elements);
    }

    private createItems() {
        for (const itemData of this.data.itemList) {
            this.game.player.stats.level.registerCallback(itemData.levelReq, () => {
                const item = new Item(this, itemData.name);
                this.items.push(item);
                this.itemListContainer.appendChild(item.element);
                highlightHTMLElement(this.menuItem, 'click');
                highlightHTMLElement(item.element, 'mouseover');
            });
        }
    }

    private createCraftListItems(craftDataList: CraftDataList) {
        const rows = [] as HTMLTableRowElement[];
        for (const craftData of craftDataList) {
            const { cost, id, levelReq } = craftData;
            const tr = document.createElement('tr');
            tr.classList.add('g-list-item', 'hidden');
            tr.setAttribute('data-id', id);
            tr.setAttribute('data-cost', cost.toFixed());
            const label = this.craftDescToHtml(id);
            tr.insertAdjacentHTML('beforeend', `<tr><td>${label}</td><td class="g-gold" data-cost>${cost}</td></tr>`);
            tr.addEventListener('click', () => {
                rows.forEach(x => x.classList.toggle('selected', x === tr));
                this.activeCraftId = id;
                this.updateCraftButton();
            });

            this.game.player.stats.level.registerCallback(levelReq, () => {
                tr.setAttribute('data-enabled', '');
                highlightHTMLElement(this.menuItem, 'click');
                highlightHTMLElement(tr, 'mouseover');
            });
            rows.push(tr);
        }
        this.itemCraftTableContainer.replaceChildren(...rows);
        rows[0]?.click();
    }

    updateCraftList(ids: CraftId[] = []) {
        this.itemCraftTableContainer.querySelectorAll(`[data-enabled][data-id]`).forEach(x => {
            const id = x.getAttribute('data-id') as CraftId;
            x.classList.toggle('hidden', !ids.includes(id));
        });
    }

    private generateCraftData(): CraftData {
        return {
            itemModList: this.activeItem.mods,
            modList: this.modLists.filter(x => x.levelReq <= this.game.player.stats.level.get())
        }
    }

    private updateCraftButton() {
        const validate = () => {
            if (!this.activeCraftId) {
                return 'No Craft Selected';
            }
            const costAttr = querySelector(`[data-id="${this.activeCraftId}"]`).getAttribute('data-cost');
            const cost = Number(costAttr);
            if (cost > this.game.player.stats.gold.get()) {
                return 'Not Enough Gold';
            }
            const template = craftTemplates[this.activeCraftId];
            const craftData = this.generateCraftData();
            const validator = template.validate(craftData);
            if (validator.errors.length > 0) {
                return validator.errors[0];
            }
            return true;
        }

        const msg = validate();
        this.craftMessageElement.textContent = typeof (msg) === 'string' ? msg : '';
        this.craftButton.disabled = typeof msg !== 'boolean';
    }

    private performCraft() {
        if (!this.activeCraftId) {
            return;
        }
        const cost = this.data.craftList.find(x => x.id === this.activeCraftId)?.cost;
        if (!cost) {
            console.error('something went wrong');
            return;
        }
        const template = craftTemplates[this.activeCraftId];
        const craftData = this.generateCraftData();
        const validator = template.validate(craftData);
        if (validator.errors.length > 0) {
            console.error('something went wrong');
            return;
        }
        this.activeItem.mods = template.getItemMods(craftData);
        this.game.player.stats.gold.subtract(cost);

        this.updateItemModList();
    }

    craftDescToHtml(id: CraftId) {
        return craftTemplates[id].desc.replace(/\[\w+\]/g, (x) => {
            const tag = x.substring(1, x.length - 1);
            return `<span data-mod-tag="${tag}">${tag}</span>`;
        });
    }
}

class Item {
    readonly element: HTMLLIElement;
    private _mods = [] as ItemModifier[];
    constructor(readonly items: Items, readonly name: string) {
        this.element = this.createElement();

        this.tryLoad();
    }
    get mods() { return this._mods; }
    set mods(v: ItemModifier[]) {
        this.items.game.player.modDB.removeBySource(this.name);
        this._mods = v;
        this.items.game.player.modDB.add(this._mods.flatMap(x => x.copy().stats), this.name);
    }
    private createElement() {
        const li = document.createElement('li');
        li.textContent = this.name;
        li.classList.add('g-list-item');
        li.setAttribute('data-name', this.name);
        li.addEventListener('click', () => {
            this.items.selectItem(this);
            this.items.items.forEach(x => x.element.classList.toggle('selected', x === this));
        });
        return li;
    }

    private tryLoad() {
        const savedItem = this.items.game.saveObj.items?.items?.find(x => x.name === this.name);
        if (!savedItem) {
            return;
        }
        if (savedItem) {
            const mods = savedItem.modList.map(savedMod => {
                const mod = this.items.modLists.find(x => x.text === savedMod.text)?.copy();
                if (!mod || savedMod.values.length !== mod.stats.length) {
                    console.error('invalid saved mod:', savedMod);
                    return;
                }
                savedMod.values.forEach((v, i) => {
                    const statMod = mod.stats[i];
                    if (statMod) {
                        statMod.value = v;
                    }
                });
                return mod;
            }).filter((x): x is ItemModifier => !!x);
            this.mods = mods;
        }
    }
}

export class ItemModifier extends Modifier {
    private readonly itemModData: ItemMod;
    public readonly levelReq: number;
    public weight: number;
    readonly groupIndex: number;
    readonly modGroup: ItemMod[];
    constructor(itemModData: ItemMod, modGroup: ItemMod[]) {
        super(itemModData.mod);
        this.itemModData = itemModData;
        this.levelReq = itemModData.levelReq;
        this.weight = itemModData.weight;
        this.groupIndex = modGroup.findIndex(x => x === itemModData);
        this.modGroup = modGroup;
    }

    copy(): ItemModifier {
        return new ItemModifier(this.itemModData, this.modGroup);
    }
}
import Component from "@src/game/components/Component";
import type Game from "@src/game/Game";
import { Modifier } from "@src/game/mods";
import type { CraftId, ItemMod } from "@src/types/gconfig";
import type GConfig from "@src/types/gconfig";
import type { Save } from "@src/types/save";
import { highlightHTMLElement, queryHTML } from "@src/utils/helpers";
import { CraftData, craftTemplates } from "./crafting";
import CraftPresets from "./CraftPresets";

type ItemsData = Required<Required<GConfig>['components']>['items'];
export type ModTables = { [K in keyof ItemsData['modLists']]: ItemModifier[] }

const mainMenuContainer = queryHTML('.p-game > menu');

export default class Items extends Component {
    private readonly itemsPage = queryHTML('.p-game .p-items');
    private readonly itemListContainer = queryHTML('[data-item-list]', this.itemsPage);
    private readonly itemModListContainer = queryHTML('[data-mod-list]', this.itemsPage);
    private readonly itemCraftTableContainer = queryHTML('.s-craft-container [data-craft-list] table', this.itemsPage);
    private readonly craftButton = queryHTML<HTMLButtonElement>('.s-craft-container [data-craft-button]', this.itemsPage);
    private readonly craftMessageElement = queryHTML<HTMLButtonElement>('[data-craft-message]', this.itemsPage);
    readonly items: Item[] = [];
    private activeItem: Item;
    private activeCraftId?: CraftId;
    readonly modLists: ItemModifier[];
    private presets: CraftPresets;
    constructor(readonly game: Game, readonly data: ItemsData) {
        super(game, 'items');

        this.modLists = data.modLists.flatMap(group => group.map(mod => new ItemModifier(mod, group)));

        if(data.itemList.length === 0 || data.itemList.sort((a, b) => a.levelReq - b.levelReq)[0]!.levelReq > data.levelReq){
            throw Error('No items available! There must be at least 1 item available');
        }
        this.createItems();
        this.activeItem = this.items[0]!;
        this.activeItem.element.click();

        queryHTML('[data-tab-target="items"]', mainMenuContainer).classList.remove('hidden');

        game.player.stats.level.addListener('change', () => this.updateCraftList());

        this.craftButton.addEventListener('click', () => this.performCraft());

        this.presets = new CraftPresets(this);

        this.game.player.stats.gold.addListener('change', () => {
            if (this.page.classList.contains('hidden')) {
                return;
            }
            if (this.activeCraftId) {
                this.updateCraftButton();
            }
        });
    }

    save(saveObj: Save) {
        saveObj.items = {
            items: this.items.map<Required<Save>['items']['items'][number]>(item => ({
                name: item.name,
                modList: item.mods.map(mod => ({
                    desc: mod.template.desc,
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
            });
        }
    }

    populateCraftList(ids: CraftId[] = []) {
        const rows = [] as HTMLTableRowElement[];
        for (const craftData of this.data.craftList.filter(x => ids.includes(x.id))) {
            const tr = document.createElement('tr');
            tr.classList.add('g-list-item');
            tr.setAttribute('data-id', craftData.id);
            tr.setAttribute('data-cost', craftData.cost.toFixed());
            const label = this.craftDescToHtml(craftData.id);
            tr.insertAdjacentHTML('beforeend', `<tr><td>${label}</td><td class="g-gold" data-cost>${craftData.cost}</td></tr>`);
            tr.addEventListener('click', () => {
                rows.forEach(x => x.classList.toggle('selected', x === tr));
                this.activeCraftId = craftData.id;
                this.updateCraftButton();
            });

            rows.push(tr);
        }
        this.itemCraftTableContainer.replaceChildren(...rows);
        this.updateCraftList();

        rows.filter(x => !x.classList.contains('hidden'))[0]?.click();
    }

    private updateCraftList() {
        this.itemCraftTableContainer.querySelectorAll('[data-id]').forEach(x => {
            const id = x.getAttribute('data-id');
            const craftData = this.data.craftList.find(x => x.id === id);
            if (!craftData) {
                return;
            }
            x.classList.toggle('hidden', craftData?.levelReq > this.game.player.stats.level.get());
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
            const costAttr = queryHTML(`[data-id="${this.activeCraftId}"]`).getAttribute('data-cost');
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

        const savedItem = items.game.saveObj.items?.items?.find(x => x.name === name);
        if (savedItem) {
            const mods = savedItem.modList.map(savedMod => {
                const mod = items.modLists.find(x => x.template.desc === savedMod.desc)?.copy();
                if (!mod) {
                    return;
                }
                savedMod.values.forEach((v, i) => {
                    const statMod = mod.stats[i];
                    if(statMod){
                        statMod.value = v;
                    }
                });
                return mod;
            }).filter((x): x is ItemModifier => !!x);
            this.mods = mods;
        }
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
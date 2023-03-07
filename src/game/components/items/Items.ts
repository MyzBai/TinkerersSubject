import Component from "@src/game/components/Component";
import type Game from "@src/game/Game";
import { Modifier } from "@src/game/mods";
import type { ItemModConfig } from "@src/types/gconfig/items";
import type ItemsConfig from "@src/types/gconfig/items";
import type GameSave from "@src/types/save/save";
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import { CraftData, CraftId, craftTemplates } from "./crafting";
import CraftPresets from "./CraftPresets";


export type ModTables = { [K in keyof ItemsConfig['modLists']]: ItemModifier[] }

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
    constructor(readonly game: Game, readonly data: ItemsConfig) {
        super(game, 'items');
        this.presets = new CraftPresets(this);
        this.modLists = data.modLists.flatMap(group => group.map(mod => new ItemModifier(mod, group)));

        if (data.itemList.length === 0 || data.itemList.sort((a, b) => a.levelReq - b.levelReq)[0]!.levelReq > data.levelReq) {
            throw Error('No items available! There must be at least 1 item available');
        }
        data.craftList.forEach(x => {
            if (!Object.keys(craftTemplates).includes(x.id)) {
                throw Error(`${x.id} is invalid`);
            }
        });
        this.createItems();
        this.activeItem = this.items[0]!;
        this.activeItem.element.click();


        this.createCraftListItems(data.craftList);
        this.updateCraftList(this.presets.activePreset?.ids);

        this.game.visiblityObserver.register(this.page, visible => {
            if (visible) {
                this.updateCraftButton();
            }
        })

        this.game.statistics.statistics.Gold.addListener('change', () => {
            if (this.page.classList.contains('hidden')) {
                return;
            }
            this.updateCraftButton();
        });

        game.statistics.statistics.Level.addListener('change', () => this.updateCraftList(this.presets.activePreset?.ids));
        this.craftButton.addEventListener('click', () => this.performCraft());
    }

    save(saveObj: GameSave) {
        saveObj.items = {
            items: this.items.reduce<Required<GameSave>['items']['items']>((a, c) => {
                a.push({ name: c.name, modList: c.mods.map(x => ({ text: x.templateDesc, values: x.stats.map(x => x.value) })) });
                return a;
            }, []),
            craftPresets: [...this.presets.presets].slice(1).reduce<Required<GameSave>['items']['craftPresets']>((a, c) => {
                a.push({ name: c.name, ids: c.ids });
                return a;
            }, [])
        };
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
            this.game.statistics.statistics.Level.registerCallback(itemData.levelReq, () => {
                const item = new Item(this, itemData.name);
                this.items.push(item);
                this.itemListContainer.appendChild(item.element);
                highlightHTMLElement(this.menuItem, 'click');
                highlightHTMLElement(item.element, 'mouseover');
            });
        }
    }

    private createCraftListItems(craftDataList: ItemsConfig['craftList']) {
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

            this.game.statistics.statistics.Level.registerCallback(levelReq, () => {
                tr.setAttribute('data-enabled', '');
                
                highlightHTMLElement(this.menuItem, 'click');
                highlightHTMLElement(this.presets.presets[0]!.element, 'mouseover');
                highlightHTMLElement(tr, 'mouseover');
            });
            rows.push(tr);
        }
        this.itemCraftTableContainer.replaceChildren(...rows);
        rows[0]?.click();
    }

    updateCraftList(ids: CraftId[] = []) {
        const elements = [...this.itemCraftTableContainer.querySelectorAll<HTMLElement>(`[data-enabled][data-id]`)];
        elements.forEach(x => {
            const id = x.getAttribute('data-id') as CraftId;
            x.classList.toggle('hidden', !ids.includes(id));
        });
        const firstElement = elements.find(x => !x.classList.contains('hidden'));
        firstElement?.click();
        if (!firstElement) {
            this.activeCraftId = undefined;
        }
        this.updateCraftButton();
    }

    private generateCraftData(): CraftData {
        return {
            itemModList: this.activeItem.mods,
            modList: this.modLists.filter(x => x.levelReq <= this.game.statistics.statistics.Level.get())
        }
    }

    private updateCraftButton() {
        const validate = () => {
            if (!this.activeCraftId) {
                return 'No Craft Selected';
            }
            const costAttr = querySelector(`[data-id="${this.activeCraftId}"]`).getAttribute('data-cost');
            const cost = Number(costAttr);
            if (cost > this.game.statistics.statistics.Gold.get()) {
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
        this.game.statistics.statistics.Gold.subtract(cost);

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
        try {
            const savedItem = this.items.game.saveObj?.items?.items?.find(x => x && x.name === this.name);
            if (!savedItem) {
                return;
            }
            const mods = savedItem.modList?.reduce<ItemModifier[]>((a, c) => {
                if (c?.text && c.values) {
                    const mod = this.items.modLists.find(x => x.templateDesc === c.text)?.copy();
                    if (!mod) {
                        return a;
                    }
                    if (c.values.length !== mod.stats.length || c.values.some(x => typeof x !== 'number')) {
                        mod.stats.forEach(x => x.value = x.min);
                        a.push(mod);
                        return a;
                    }

                    c.values.forEach((x, i) => {
                        if (!x || typeof x !== 'number') {
                            return;
                        }
                        const stat = mod.stats[i]!;
                        stat.value = x;
                    });
                    a.push(mod);
                    return a;
                }
                return a;
            }, []) || [];
            this.mods = mods;
        } catch (e) {
            throw Error('failed loading items');
        }

    }
}

export class ItemModifier extends Modifier {
    private readonly itemModData: ItemModConfig;
    public readonly levelReq: number;
    public weight: number;
    readonly groupIndex: number;
    readonly modGroup: ItemModConfig[];
    constructor(itemModData: ItemModConfig, modGroup: ItemModConfig[]) {
        super(itemModData.mod);
        this.itemModData = itemModData;
        this.levelReq = itemModData.levelReq;
        this.weight = itemModData.weight;
        this.groupIndex = modGroup.findIndex(x => x === itemModData);
        this.modGroup = modGroup;
    }

    copy(): ItemModifier {
        const copy = new ItemModifier(this.itemModData, this.modGroup);
        copy.stats.forEach((v, i) => v.value = this.stats[i]?.value || v.min);
        return copy;
    }
}
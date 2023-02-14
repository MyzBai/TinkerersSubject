import Component from "@src/game/Component";
import type Game from "@src/game/game";
import { Modifier } from "@src/game/mods";
import type { CraftId, ItemMod } from "@src/types/gconfig";
import type GConfig from "@src/types/gconfig";
import { highlightHTMLElement, queryHTML, registerMutationObserver, registerTabs } from "@src/utils/helpers";
import { visibilityObserver } from "@src/utils/Observers";
import { CraftData, craftTemplates } from "./crafting";
import CraftPresets from "./CraftPresets";

type ItemsData = Required<Required<GConfig>['components']>['items'];
export type ModTables = { [K in keyof ItemsData['modLists']]: ItemModifier[] }

const mainMenuContainer = queryHTML('.p-game [data-main-menu]');
const itemsPage = queryHTML('.p-game .p-items');
const itemListContainer = queryHTML('[data-item-list]', itemsPage);
const itemModListContainer = queryHTML('[data-mod-list]', itemsPage);
const itemCraftTableContainer = queryHTML('.s-craft-container [data-craft-list] table', itemsPage);
const craftButton = queryHTML<HTMLButtonElement>('.s-craft-container [data-craft-button]');
const craftMessageElement = queryHTML('[data-craft-message]', itemsPage);

export default class Items extends Component {

    readonly items: Item[] = [];
    private activeItem: Item;
    private activeCraftId?: CraftId;
    private modLists: ItemModifier[];
    private presets: CraftPresets;
    private goldListener: (v: number) => void;
    private readonly craftCallback: () => void;
    private observers = [] as (MutationObserver | IntersectionObserver)[];
    constructor(readonly game: Game, readonly data: ItemsData) {
        super(game);
        
        this.modLists = data.modLists.flatMap(group => group.map(mod => new ItemModifier(mod, group)));

        if (data.itemList.sort((a, b) => a.levelReq - b.levelReq)[0].levelReq > data.levelReq) {
            throw Error('No items available! There must be at least 1 item available');
        }
        this.createItems();
        this.activeItem = this.items[0];
        this.activeItem.element.click();

        if ([...data.craftList].sort((a, b) => a.levelReq - b.levelReq)[0].levelReq > data.levelReq) {
            throw Error('No crafts available! There must be at least 1 craft available');
        }
        mainMenuContainer.querySelector('[data-tab-target="items"]')?.classList.remove('hidden');

        game.player.stats.level.addListener('change', v => {
            this.updateCraftList();
        });

        this.craftCallback = () => {
            this.performCraft();
        };
        craftButton.addEventListener('click', this.craftCallback);

        this.presets = new CraftPresets(this);

        this.goldListener = (v) => {
            if (this.activeCraftId) {
                this.updateCraftButton();
            }
        };
        this.observers.push(visibilityObserver(itemsPage, visible => {
            if (visible) {
                this.updateCraftButton();
                game.player.stats.gold.addListener('change', this.goldListener)
            } else {
                game.player.stats.gold.removeListener('change', this.goldListener);
            }
        }));


    }

    dispose(): void {
        queryHTML('.p-game [data-main-menu] [data-tab-target="items"]').classList.add('hidden');
        craftButton.removeEventListener('click', this.craftCallback);
        this.observers.forEach(x => x.disconnect());
        this.presets.dispose();

        itemListContainer.replaceChildren();
        itemModListContainer.replaceChildren();
        itemCraftTableContainer.replaceChildren();
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
        itemModListContainer.replaceChildren(...elements);
    }

    private createItems() {
        for (const itemData of this.data.itemList) {
            this.game.player.stats.level.registerCallback(itemData.levelReq, () => {
                const item = new Item(this, itemData.name);
                this.items.push(item);
                itemListContainer.appendChild(item.element);
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
            const label = craftTemplates[craftData.id].desc;
            tr.insertAdjacentHTML('beforeend', `<tr><td>${label}</td><td class="g-gold" data-cost>${craftData.cost}</td></tr>`);
            tr.addEventListener('click', () => {
                rows.forEach(x => x.classList.toggle('selected', x === tr));
                this.activeCraftId = craftData.id;
                this.updateCraftButton();
            });

            rows.push(tr);
        }
        itemCraftTableContainer.replaceChildren(...rows);
        this.updateCraftList();

        rows.filter(x => !x.classList.contains('hidden'))[0]?.click();
    }

    private updateCraftList() {
        itemCraftTableContainer.querySelectorAll('[data-id]').forEach(x => {
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
            const cost = Number(itemCraftTableContainer.querySelector(`[data-id="${this.activeCraftId}"]`)?.getAttribute('data-cost'));
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
        craftMessageElement.textContent = typeof (msg) === 'string' ? msg : '';
        craftButton.disabled = typeof msg !== 'boolean';
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
}

class Item {
    readonly element: HTMLLIElement;
    private _mods = [] as ItemModifier[];
    constructor(readonly items: Items, readonly name: string) {
        this.element = this.createElement();
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
    private readonly modGroup: ItemMod[];
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
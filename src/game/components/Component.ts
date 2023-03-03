import type ComponentsConfig from "@src/types/gconfig/components";
import type { Save } from "@src/types/save";
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import type Game from "../Game";

export default abstract class Component {
    private _page: HTMLElement;
    private _menuItem: HTMLElement;
    constructor(readonly game: Game, readonly name: keyof ComponentsConfig) {
        this._page = querySelector(`.p-game .p-${name}`);
        this._menuItem = querySelector(`.p-game [data-main-menu] [data-tab-target="${name}"]`);

        highlightHTMLElement(this._menuItem, 'click');
    }

    get page() { return this._page; }
    get menuItem() { return this._menuItem; }

    dispose() {
        this.page.remove();
        this.page.replaceChildren(); //dom events would cause memory leak without this
        this.menuItem.remove();
        // console.log(`${this.name} was disposed`);
    }
    abstract save(saveObj: Save): void;
}
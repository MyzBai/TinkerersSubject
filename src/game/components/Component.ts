import GConfig from "@src/types/gconfig";
import type { Save } from "@src/types/save";
import { queryHTML } from "@src/utils/helpers";
import type Game from "../Game";

export default abstract class Component {
    private _page: HTMLElement;
    private _menuItem: HTMLElement;
    protected updateUITime = 0;
    constructor(readonly game: Game, readonly name: keyof Required<GConfig>['components']) {
        this._page = queryHTML(`.p-game .p-${name}`);
        this._menuItem = queryHTML(`.p-game > menu [data-tab-target="${name}"]`);
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

    //@ts-ignore
    updateUI(time: number) { }
}
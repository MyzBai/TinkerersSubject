import type { Save } from "@src/types/save";
import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import Component from "./Component";
import type Game from "../Game";
import { Modifier } from "../mods";
import type PassivesConfig from "@src/types/gconfig/passives";
import type { PassiveConfig } from "@src/types/gconfig/passives";

export default class Passives extends Component {

    readonly passives: Passive[] = [];
    readonly passivesListContainer: HTMLElement;
    constructor(readonly game: Game, readonly data: PassivesConfig) {
        super(game, 'passives');

        this.passivesListContainer = querySelector('.s-passive-list table', this.page);

        {
            //init passive list
            for (const passiveListData of data.passiveLists) {
                passiveListData.sort((a, b) => a.levelReq - b.levelReq);
                for (const passiveData of passiveListData) {
                    const passive = new Passive(this, passiveData, this.passives.length);
                    passive.element.addEventListener('click', () => {
                        passive.assigned = !passive.assigned;
                        this.updatePoints();
                        this.updatePassiveList();
                    });
                    this.game.statistics.statistics.Level.registerCallback(passiveData.levelReq, () => {
                        passive.element.classList.remove('hidden');
                        highlightHTMLElement(this.menuItem, 'click');
                        highlightHTMLElement(passive.element, 'mouseover');
                    });
                    this.passives.push(passive);
                }
                querySelector('.s-passive-list table', this.page).append(...this.passives.map(x => x.element));
            }
        }

        this.game.statistics.statistics.Level.addListener('change', () => {
            this.updatePoints();
            this.updatePassiveList();
        });

        querySelector('[data-clear]', this.page).addEventListener('click', () => this.clearPassives());

        this.updatePoints();
        this.updatePassiveList();
    }

    get maxPoints() {
        return this.data.pointsPerLevel * this.game.statistics.statistics.Level.get() - 1;
    }
    get curPoints() {
        return this.maxPoints - this.passives.filter(x => x.assigned).reduce((a, c) => a += c.data.points, 0);
    }

    private clearPassives() {
        this.passives.forEach(x => x.assigned = false);
        this.updatePassiveList();
        this.updatePoints();
    }

    save(saveObj: Save): void {
        saveObj.passives = {
            list: this.passives.filter(x => x.assigned).map((x) => ({
                index: this.passives.indexOf(x),
                desc: x.data.mod
            }))
        }
    }

    private updatePoints() {
        querySelector<HTMLSpanElement>('.p-game .p-passives [data-cur-points]').textContent = this.curPoints.toFixed();
        querySelector<HTMLSpanElement>('.p-game .p-passives [data-max-points]').textContent = this.maxPoints.toFixed();
    }

    private updatePassiveList() {
        for (const passive of this.passives) {
            const { element, assigned } = passive;
            element.toggleAttribute('disabled', !passive.assigned && this.curPoints < passive.data.points);
            element.classList.toggle('selected', assigned);
        }
    }
}

class Passive {
    private _assigned = false;
    readonly element: HTMLTableRowElement;
    readonly mod: Modifier;
    constructor(readonly passives: Passives, readonly data: PassiveConfig, readonly index: number) {
        this.mod = new Modifier(data.mod);

        this.element = this.createElement();
        highlightHTMLElement(this.element, 'mouseover');
        passives.game.statistics.statistics.Level.registerCallback(data.levelReq, () => {
            this.element.classList.remove('hidden');
        });

        const savedList = passives.game.saveObj.passives?.list;
        if (savedList) {
            const desc = savedList.find(x => x.index === index)?.desc;
            if (desc === data.mod && passives.curPoints >= data.points) {
                this.assigned = true;
            }
        }
    }

    get assigned() {
        return this._assigned;
    }

    set assigned(v: boolean) {
        const modDB = this.passives.game.player.modDB;
        const source = 'Passives'.concat('/', this.index.toFixed());
        if (v) {
            this._assigned = true;
            const mods = this.mod.copy().stats;
            modDB.add(mods, source);
        } else {
            this._assigned = false;
            modDB.removeBySource(source);
        }
    }

    private createElement() {
        const row = document.createElement('tr');
        row.classList.add('g-list-item', 'hidden');
        row.insertAdjacentHTML('beforeend', `<td>${this.mod.desc}</td>`);
        row.insertAdjacentHTML('beforeend', `<td>${this.data.points}</td>`);
        return row;
    }
}

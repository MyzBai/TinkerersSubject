import { highlightHTMLElement, querySelector } from "@src/utils/helpers";
import Component from "./Component";
import Game, { Save } from "../Game";
import { Modifier } from "../mods";
import Statistics from "../Statistics";
import Player from "../Player";

export default class Passives extends Component {

    readonly passives: Passive[] = [];
    readonly passivesListContainer: HTMLElement;
    constructor(readonly data: PassivesConfig) {
        super('passives');

        this.passivesListContainer = this.page.querySelectorForce('.s-passive-list table');

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
                    Statistics.statistics.Level.registerCallback(passiveData.levelReq, () => {
                        passive.element.classList.remove('hidden');
                        highlightHTMLElement(this.menuItem, 'click');
                        highlightHTMLElement(passive.element, 'mouseover');
                    });
                    this.passives.push(passive);
                }
                this.page.querySelectorForce('.s-passive-list table').append(...this.passives.map(x => x.element));
            }
        }

        Statistics.statistics.Level.addListener('change', () => {
            this.updatePoints();
            this.updatePassiveList();
        });

        this.page.querySelectorForce('[data-reset]').addEventListener('click', () => this.resetPassives());

        this.updatePoints();
        this.updatePassiveList();
    }

    get maxPoints() {
        return this.data.pointsPerLevel * Statistics.statistics.Level.get() - 1;
    }
    get curPoints() {
        return this.maxPoints - this.passives.filter(x => x.assigned).reduce((a, c) => a += c.data.points, 0);
    }

    private resetPassives() {
        this.passives.forEach(x => x.assigned = false);
        this.updatePassiveList();
        this.updatePoints();
    }

    save(saveObj: Save) {
        saveObj.passives = {
            list: this.passives.reduce<Required<Save>['passives']['list']>((a, c) => {
                if (c.assigned) {
                    a.push({ desc: c.mod.templateDesc, index: c.index });
                }
                return a;
            }, [])
        };
    }

    private updatePoints() {
        if (this.curPoints < 0) {
            this.resetPassives();
            console.warn('current passive points cannot go negative. passives have been reset');
        }
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
        Statistics.statistics.Level.registerCallback(data.levelReq, () => {
            this.element.classList.remove('hidden');
        });

        const savedList = Game.saveObj?.passives?.list;
        if (savedList) {
            const desc = savedList.find(x => x && x.index === index)?.desc;
            if (desc === data.mod && passives.curPoints >= data.points) {
                this.assigned = true;
            }
        }
    }

    get assigned() {
        return this._assigned;
    }

    set assigned(v: boolean) {
        const modDB = Player.modDB;
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

//config
export interface PassivesConfig {
    pointsPerLevel: number;
    passiveLists: PassiveConfig[][];
}

export interface PassiveConfig{
    levelReq: number;
    points: number;
    mod: string;
}

//save
export interface PassivesSave {
    list: PassiveSave[];
}

interface PassiveSave {
    index: number;
    desc: string;
}
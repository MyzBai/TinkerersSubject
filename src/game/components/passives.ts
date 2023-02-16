import type GConfig from "@src/types/gconfig";
import { queryHTML } from "@src/utils/helpers";
import { visibilityObserver } from "@src/utils/Observers";
import Component from "../Component";
import type Game from "../Game";
import { Modifier } from "../mods";

type PassivesData = Required<Required<GConfig>['components']>['passives'];
type PassiveData = PassivesData['passiveLists'][number][number];

export default class Passives extends Component {

    private passives: Passive[];
    private observer: IntersectionObserver;
    private levelListener: (v: number) => void;
    constructor(readonly game: Game, readonly data: PassivesData) {
        super(game);
        this.passives = [];

        this.levelListener = (v) => {
            this.updatePoints();
            this.updatePassiveList();
        };

        for (const passiveListData of data.passiveLists) {
            passiveListData.sort((a, b) => a.levelReq - b.levelReq);
            for (const passiveData of passiveListData) {
                const passive = new Passive(this, passiveData);
                passive.element.addEventListener('click', () => {
                    passive.assigned = !passive.assigned;
                    this.updatePoints();
                    this.updatePassiveList();
                })
                this.passives.push(passive);
            }
        }
        queryHTML('.p-game .p-passives .s-passive-list table').append(...this.passives.map(x => x.element));

        this.observer = visibilityObserver(queryHTML('.p-game .p-passives'), visible => {
            if (visible) {
                this.game.player.stats.level.addListener('change', this.levelListener);
            } else {
                this.game.player.stats.level.removeListener('change', this.levelListener);
            }
        });

        this.updatePoints();
        this.updatePassiveList();


        queryHTML('.p-game [data-main-menu] [data-tab-target="passives"]').classList.remove('hidden');
    }

    get maxPoints() {
        return this.data.pointsPerLevel * this.game.player.stats.level.get() - 1;
    }
    get curPoints() {
        return this.maxPoints - this.passives.filter(x => x.assigned).reduce((a, c) => a += c.data.points, 0);
    }

    dispose(): void {
        this.observer.disconnect();
        queryHTML('.p-game .p-passives .s-passive-list table').replaceChildren();
    }

    private updatePoints() {
        queryHTML<HTMLSpanElement>('.p-game .p-passives [data-cur-points]').textContent = this.curPoints.toFixed();
        queryHTML<HTMLSpanElement>('.p-game .p-passives [data-max-points]').textContent = this.maxPoints.toFixed();
    }

    private updatePassiveList() {
        for (const passive of this.passives) {
            const { element, assigned } = passive;
            element.classList.toggle('hidden', passive.data.levelReq > this.game.player.stats.level.get());
            element.toggleAttribute('disabled', !passive.assigned && this.curPoints < passive.data.points);
            element.classList.toggle('selected', assigned);
        }
    }
}

class Passive {
    private _assigned = false;
    readonly element: HTMLTableRowElement;
    readonly mod: Modifier;
    constructor(readonly passives: Passives, readonly data: PassiveData) {
        this.mod = new Modifier(data.mod);
        this.element = this.createElement();
        passives.game.player.stats.level.registerCallback(data.levelReq, () => {
            this.element.classList.remove('hidden');
        });
    }

    get assigned() {
        return this._assigned;
    }

    set assigned(v: boolean) {
        const modDB = this.passives.game.player.modDB;
        const source = 'Passives'.concat('/', this.element.rowIndex.toFixed());
        console.log(source);
        if (v) {
            this._assigned = true;
            const mods = this.mod.copy().stats;
            console.log(mods);
            modDB.add(mods, source);
        } else {
            this._assigned = false;
            modDB.removeBySource(source);
        }
    }

    private createElement() {
        const row = document.createElement('tr');
        row.classList.add('g-list-item');
        row.insertAdjacentHTML('beforeend', `<td>${this.mod.desc}</td>`);
        row.insertAdjacentHTML('beforeend', `<td>${this.data.points}</td>`);
        return row;
    }
}

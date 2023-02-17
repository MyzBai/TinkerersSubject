import type { Save } from "@src/types/save";
import { queryHTML } from "@src/utils/helpers";
import { visibilityObserver } from "@src/utils/Observers";
import Value from "@utils/Value";
import type Game from "./Game";

export class Statistic extends Value {
    readonly hidden: boolean;
    constructor(defaultValue: number, hidden?: boolean) {
        super(defaultValue);
        this.hidden = hidden || false;
    }
}

export default class Statistics {
    public readonly statistics = {
        'Time Played': new Statistic(0),
        'Gold Generated': new Statistic(0),
        'Mana Generated': new Statistic(0),
        'Hits': new Statistic(0),
        'Critical Hits': new Statistic(0),
        'Total Damage': new Statistic(0),
        'Total Physical Damage': new Statistic(0),
        'Prestige Count': new Statistic(0),
    } as const;
    private readonly page = queryHTML('.p-game .p-statistics');
    constructor(readonly game: Game) {

        let loopId: string | undefined;
        visibilityObserver(this.page, visible => {
            if (visible) {
                this.updateStatisticsUI();
                console.log(this.game.statistics.statistics["Gold Generated"].get());
                loopId = this.game.gameLoop.subscribe(() => this.updateStatisticsUI(), { intervalMilliseconds: 1000 });
            } else {
                this.game.gameLoop.unsubscribe(loopId);
            }
        });
    }

    init() {
        this.game.onSave.listen(this.save.bind(this));
        Object.values(this.statistics).forEach(x => x.reset());
        if (this.game.saveObj.statistics) {
            this.game.saveObj.statistics.forEach(({ name, value }) => {
                this.statistics[name].set(value);
            });
        }
        this.createStatisticsElements();
        this.updateStatisticsUI();
    }

    private createStatisticsElements() {
        const elements: HTMLLIElement[] = [];
        const createField = (key: string) => {
            const element = document.createElement('li');
            element.classList.add('g-field', 'hidden');
            const label = document.createElement('div');
            element.appendChild(label);
            const value = document.createElement('var');
            element.appendChild(value);
            label.textContent = key;
            value.setAttribute('data-stat', key);
            value.setAttribute('data-format-type', this.getFormatType(key as keyof typeof this.statistics));
            return element;
        }
        for (const key of Object.keys(this.statistics)) {
            const element = createField(key as string);
            elements.push(element);
        }
        queryHTML('.p-statistics ul').replaceChildren(...elements);
    }

    private getFormatType(key: keyof typeof this.statistics) {
        switch (key) {
            case 'Time Played': return 'time';
        }
        return '';
    }

    private updateStatisticsUI() {
        for (const [key, value] of Object.entries(this.statistics)) {
            const element = queryHTML(`.p-statistics [data-stat="${key}"]`);
            if (!element) {
                continue;
            }
            const valueZero = value.get() === 0;
            element.parentElement?.classList.toggle('hidden', valueZero);
            if (valueZero) {
                continue;
            }
            const type = element.getAttribute('data-format-type');
            switch (type) {
                case 'time':
                    const date = new Date(0);
                    date.setSeconds(value.get());
                    const str = date.toISOString().substring(11, 19);
                    element.textContent = str;
                    break;
                default:
                    element.textContent = value.get().toFixed(0);
            }
        }
    }

    save(saveObj: Save) {
        saveObj.statistics = Object.entries(this.statistics).map(([key, value]) => {
            return {
                name: key as keyof Statistics['statistics'],
                value: value.get()
            }
        });
    }
}

// export function saveStatistics(saveObj: Save) {
//     saveObj.statistics = Object.entries(statistics).map(([key, value]) => {
//         return {
//             name: key,
//             value: value.get()
//         }
//     });
// }

// export function loadStatistics(saveObj: Save) {
//     saveObj.statistics?.forEach(x => {
//         statistics[x.name as keyof typeof statistics]?.set(x.value);
//     });
// }
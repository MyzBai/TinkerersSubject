import type { Save } from "@src/types/save";
import { querySelector } from "@src/utils/helpers";
import Value from "@utils/Value";
import { calcPlayerStats } from "./calc/calcMod";
import type Game from "./Game";

export type StatisticsList = [string, Statistics, boolean][];

interface StatisticParams {
    defaultValue?: number;
    checked?: boolean;
    format?: 'none' | 'pct' | 'time';
    decimals?: number;
    save?: boolean;
}

export class Statistic extends Value {
    sticky: boolean;
    readonly decimals: number;
    readonly format: StatisticParams['format'];
    readonly save: boolean;
    constructor(args?: StatisticParams) {
        super(args?.defaultValue || 0);
        this.sticky = args?.checked || false;
        this.format = args?.format || 'none';
        this.decimals = args?.decimals || 0;
        this.save = args?.save || false;
    }
}

export default class Statistics {
    public readonly statistics = {
        'Level': new Statistic({ defaultValue: 1, checked: true, save: true }),
        'Gold': new Statistic({ defaultValue: 0, checked: true, save: true }),
        'Gold Per Second': new Statistic({ defaultValue: 0, checked: true }),
        'Dps': new Statistic({ checked: true }),
        'Hit Chance': new Statistic({ checked: true, format: 'pct' }),
        'Attack Speed': new Statistic({ defaultValue: Number.MAX_VALUE, checked: true }),
        //Crit
        'Critical Hit Chance': new Statistic({ format: 'pct' }),
        'Critical Hit Multiplier': new Statistic({ format: 'pct' }),
        //Mana
        'Maximum Mana': new Statistic(),
        'Mana Regeneration': new Statistic(),
        'Attack Mana Cost': new Statistic(),
        'Current Mana': new Statistic({ save: false }),
        //Bleed
        'Bleed Chance': new Statistic({ format: 'pct' }),
        'Bleed Dps': new Statistic(),
        'Bleed Duration': new Statistic(),
        'Maximum Bleed Stacks': new Statistic(),
        //Burn
        'Burn Chance': new Statistic({ format: 'pct' }),
        'Burn Dps': new Statistic(),
        'Burn Duration': new Statistic(),
        'Maximum Burn Stacks': new Statistic(),

        //Other
        'Skill Duration Multiplier': new Statistic({ format: 'pct' }),

        //Accumulation
        'Time Played': new Statistic({ save: true, format: 'time' }),
        'Gold Generated': new Statistic({ save: true }),
        'Mana Generated': new Statistic({ save: true }),
        'Hits': new Statistic({ save: true }),
        'Critical Hits': new Statistic({ save: true }),
        'Total Damage': new Statistic({ save: true }),
        'Total Physical Damage': new Statistic({ save: true }),
        'Total Elemental Damage': new Statistic({ save: true }),
        'Total Bleed Damage': new Statistic({ save: true }),
        'Total Burn Damage': new Statistic({ save: true }),
        'Prestige Count': new Statistic({ save: true }),
    } as const;
    private readonly page = querySelector('.p-game .p-statistics');
    private readonly pageListContainer: HTMLElement;
    private readonly sideListContainer: HTMLElement;
    private statsUpdateId = -1;
    constructor(readonly game: Game) {
        this.pageListContainer = querySelector('ul', this.page);
        this.sideListContainer = querySelector('.s-stats', this.game.page);
        this.createStatisticsElements();
        this.createSideListItems();

        game.player.modDB.onChange.listen(async () => {
            return new Promise((resolve) => {
                clearTimeout(this.statsUpdateId);
                this.statsUpdateId = window.setTimeout(async () => {
                    calcPlayerStats(this.game);
                    resolve();
                }, 1);
            });
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
        this.game.visiblityObserver.registerLoop(this.page, visible => {
            if (visible) {
                this.updatePageStatisticsUI();
            }
        }, { intervalMilliseconds: 1000 });

        this.game.visiblityObserver.registerLoop(this.game.page, visible => {
            if(visible){
                this.updateSideStatisticsUI();
            }
        });

        this.statistics.Gold.addListener('change', () => {
            this.updateSideStatisticsUI();
        });

        this.statistics.Level.set(this.game.saveObj.player?.level || 1);
        this.statistics.Gold.set(this.game.saveObj.player?.gold || 0);

        calcPlayerStats(this.game);
        this.updatePageStatisticsUI();
        this.updateSideStatisticsUI();
    }

    private createStatisticsElements() {
        const elements: HTMLLIElement[] = [];
        const createField = (key: keyof typeof this.statistics, value: Statistic) => {
            const element = document.createElement('li');
            element.classList.add('g-field', 'g-list-item');
            element.setAttribute('data-stat', key);
            element.insertAdjacentHTML('beforeend', `<div>${key}</div>`);
            element.insertAdjacentHTML('beforeend', `<var data-format></var>`);
            if (value.format === 'pct') {
                element.insertAdjacentHTML('beforeend', '%');
            }
            element.addEventListener('click', () => {
                this.statistics[key].sticky = !this.statistics[key].sticky;
                this.updatePageStatisticsUI();
                this.updateSideStatisticsUI();
            });

            return element;
        }
        for (const [key, value] of Object.entries(this.statistics)) {
            const element = createField(key as keyof typeof this.statistics, value);
            elements.push(element);
        }
        this.pageListContainer.replaceChildren(...elements);
    }

    private createSideListItems() {
        const elements: HTMLElement[] = [];
        for (const key of Object.keys(this.statistics)) {
            const element = document.createElement('li');
            element.classList.add('g-field');
            element.setAttribute('data-stat', key);
            elements.push(element);

            element.insertAdjacentHTML('beforeend', `<div>${key}</div>`);
            element.insertAdjacentHTML('beforeend', `<var data-format></var>`);
        }
        this.sideListContainer.replaceChildren(...elements);
    }

    private updatePageStatisticsUI() {
        for (const [key, statistic] of Object.entries(this.statistics)) {
            const element = querySelector(`li[data-stat="${key}"]`, this.pageListContainer);
            element.classList.toggle('selected', statistic.sticky);
            this.updateListItem(element, statistic);
        }
    }

    private updateSideStatisticsUI() {
        for (const [key, statistic] of Object.entries(this.statistics)) {
            const element = querySelector(`li[data-stat="${key}"]`, this.sideListContainer);
            element.classList.toggle('hidden', !statistic.sticky);
            if(!statistic.sticky){
                continue;
            }
            this.updateListItem(element, statistic);
        }
    }

    private updateListItem(element: HTMLElement, statistic: Statistic) {
        const variableElement = querySelector('var', element);
        const type = variableElement.getAttribute('data-format');
        let value: number | string = statistic.get();
        switch (type) {
            case 'time':
                const date = new Date(0);
                date.setSeconds(value);
                const str = date.toISOString().substring(11, 19);
                value = str;
                break;
            case 'pct':
                value *= 100;
                break;
            default:
                value = value.toFixed(statistic.decimals)
        }
        variableElement.textContent = typeof value === 'number' ? value.toFixed(statistic.decimals) : value;
    }



    save(saveObj: Save) {
        saveObj.statistics = Object.entries(this.statistics).filter(x => x[1].save).map(([key, value]) => {
            return {
                name: key as keyof Statistics['statistics'],
                value: value.get()
            }
        });
    }
}
import { querySelector } from "@src/utils/helpers";
import Value from "@utils/Value";
import { calcModTotal, Configuration } from "./calc/calcMod";
import Game, { Save } from "./Game";
import { KeywordModifierFlag } from "./mods";
import Player from "./Player";


interface StatisticOptions {
    defaultValue?: number;
    sticky?: boolean;
    format?: 'none' | 'pct' | 'time' | 'seconds';
    formatColor?: 'gold';
    decimals?: number;
}


interface StatisticsObject {
    stats: Record<string, Statistic>;
}

export class Statistic extends Value {
    sticky: boolean;
    constructor(readonly opts: StatisticOptions = {}) {
        super(opts?.defaultValue || 0);
        this.sticky = opts.sticky || false;
    }

    reset(): void {
        super.reset();
    }
}

export class GameStatistics implements StatisticsObject {
    readonly stats = {
        'Time Played': new Statistic({ format: 'time' }),
        'Level': new Statistic({ defaultValue: 1, sticky: true }),
        'Gold': new Statistic({ sticky: true, formatColor: 'gold' }),
        'Gold Generation': new Statistic({ sticky: true, format: 'seconds' }),
        'Gold Generated': new Statistic(),
        //Accumulation
        'Total Damage': new Statistic(),
        'Total Physical Damage': new Statistic(),
        'Total Elemental Damage': new Statistic(),
        'Total Bleed Damage': new Statistic(),
        'Total Burn Damage': new Statistic(),
    } as const;
}

export class EntityStatistics implements StatisticsObject {
    readonly stats = {
        'Dps': new Statistic({ sticky: true }),
        'Hit Chance': new Statistic({ sticky: true, format: 'pct' }),
        'Attack Speed': new Statistic({ defaultValue: Number.MAX_VALUE, sticky: true, decimals: 2 }),

        //Attack
        'Attack Dps': new Statistic(),
        'Attack Damage': new Statistic(),
        'Physical Attack Damage': new Statistic(),
        'Elemental Attack Damage': new Statistic(),
        //Crit
        'Critical Hit Chance': new Statistic({ format: 'pct' }),
        'Critical Hit Multiplier': new Statistic({ defaultValue: 1, format: 'pct' }),

        //Bleed
        'Bleed Chance': new Statistic({ format: 'pct' }),
        'Bleed Dps': new Statistic(),
        'Bleed Duration': new Statistic({ format: 'seconds' }),
        'Maximum Bleed Stacks': new Statistic(),
        //Burn
        'Burn Chance': new Statistic({ format: 'pct' }),
        'Burn Dps': new Statistic(),
        'Burn Duration': new Statistic({ format: 'seconds' }),
        'Maximum Burn Stacks': new Statistic(),

        //Accumulation
        'Hits': new Statistic(),
        'Critical Hits': new Statistic(),
        'Total Damage': new Statistic(),
        'Total Physical Damage': new Statistic(),
        'Total Elemental Damage': new Statistic(),
        'Total Bleed Damage': new Statistic(),
        'Total Burn Damage': new Statistic(),
    } as const;
}

export class PlayerStatistics implements EntityStatistics {
    stats = {
        ...new EntityStatistics().stats,
        'Current Mana': new Statistic(),
        //Mana
        'Maximum Mana': new Statistic(),
        'Mana Regeneration': new Statistic(),
        'Attack Mana Cost': new Statistic(),
        //Other
        'Skill Duration Multiplier': new Statistic({ format: 'pct' }),

        //Accumulation
        'Mana Generated': new Statistic(),
        'Maximum Minions': new Statistic()
    }
}

export class MinionStatistics implements EntityStatistics {
    stats = {
        ...new EntityStatistics().stats,
    }
}

export class Statistics {
    private readonly page = querySelector('.p-game .p-statistics');
    private readonly pageListContainer: HTMLElement;
    private readonly sideListContainer: HTMLElement;
    readonly gameStats = new GameStatistics().stats;
    private readonly statistics = new Map<string, StatisticsObject['stats']>();
    constructor() {
        this.pageListContainer = this.page.querySelectorForce('ul');
        this.sideListContainer = querySelector('.p-game .s-stats ul');
    }

    init() {
        Game.onSave.listen(this.save.bind(this));

        if (Game.saveObj?.statistics?.gameStatistics) {
            Object.entries(Game.saveObj?.statistics?.gameStatistics).forEach(([key, value]) => {
                const stat = this.gameStats[key as keyof GameStatistics['stats']];
                if (stat) {
                    stat.set(value?.value || stat.defaultValue);
                    stat.sticky = value?.sticky || false;
                }
            });
        }

        Game.visiblityObserver.register(this.page, visible => {
            if (visible) {
                this.updateContainer(this.pageListContainer);
            }
        });
        
        this.updateStats('Global', this.gameStats);
    }

    updateAll() {
        for (const [key, stats] of this.statistics) {
            this.updateStats(key, stats);
        }
    }

    updateStats(name: string, stats: StatisticsObject['stats']) {
        if (!this.statistics.has(name)) {
            this.statistics.set(name, stats);
        }

        const group = this.pageListContainer.querySelector(`[data-name="${name}"]`);
        if (group) {
            if (!this.page.classList.contains('hidden')) {
                this.updateHeaderContents(name, stats, this.pageListContainer);
            }
            this.updateHeaderContents(name, stats, this.sideListContainer);
            return;
        }

        this.createPageListGroup(name);
        this.createSideListGroup(name);
    }

    removeStats(name: string) {
        this.statistics.delete(name);
        this.pageListContainer.querySelector(`[data-name="${name}"]`)?.remove();
        this.sideListContainer.querySelector(`[data-name="${name}"]`)?.remove();
    }

    calcGlobalStats() {
        const config: Configuration = {
            statModList: Player.modDB.modList.filter(x => x.keywords === KeywordModifierFlag.Global),
            flags: 0,
            keywords: KeywordModifierFlag.Global
        }
        const v = calcModTotal('GoldGeneration', config);
        this.gameStats["Gold Generation"].set(v);
    }

    reset() {
        Object.values(this.gameStats).forEach(x => x.reset());
        this.statistics.clear();
        this.pageListContainer.replaceChildren();
        this.sideListContainer.replaceChildren();
    }

    private createPageListGroup(label: string) {
        let accordion = this.pageListContainer.querySelector<HTMLElement>(`[data-name="${label}"]`);
        if (accordion) {
            accordion.classList.remove('hidden');
        } else {
            accordion = this.createAccordion(label) || null;
            if (accordion) {
                this.pageListContainer.appendChild(accordion);
            }
        }
        accordion?.querySelectorAll(`[data-stat]`).forEach(element => {
            const statName = element.getAttribute('data-stat') as keyof StatisticsObject['stats'];

            element.classList.toggle('selected', this.statistics.get(label)?.[statName]?.sticky || false);
            element.addEventListener('click', () => {
                const stat = this.statistics.get(label)?.[statName];
                if (!stat) {
                    return;
                }
                stat.sticky = !stat.sticky;
                element.classList.toggle('selected', stat.sticky);
                this.updateContainer(this.sideListContainer);
            });
        });
        const stats = this.statistics.get(label);
        if (stats) {
            this.updateHeaderContents(label, stats, this.pageListContainer);
        }
    }

    private createSideListGroup(label: string) {
        let accordion = this.sideListContainer.querySelector<HTMLElement>(`[data-name="${label}"]`);
        if (accordion) {
            accordion.classList.remove('hidden');
        } else {
            accordion = this.createAccordion(label) || null;
            if (accordion) {
                accordion?.setAttribute('data-side-stats', '');
                this.sideListContainer.appendChild(accordion);
            }
        }
        const stats = this.statistics.get(label);
        if (stats) {
            this.updateHeaderContents(label, stats, this.sideListContainer);
        }
    }

    private createAccordion(label: string) {
        const stats = this.statistics.get(label);
        if (!stats) {
            return;
        }
        const accordion = document.createElement('li');
        accordion.classList.add('g-accordion');
        accordion.setAttribute('data-name', label);
        const header = document.createElement('div');
        accordion.appendChild(header);
        header.classList.add('header');
        header.insertAdjacentHTML('beforeend', `<div data-label>${label}</div>`);

        const content = document.createElement('ul');
        accordion.appendChild(content);
        content.classList.add('content');

        for (const [key, value] of Object.entries(stats)) {
            const element = document.createElement('li');
            element.classList.add('g-field', 'g-list-item');
            element.setAttribute('data-stat', key);
            element.insertAdjacentHTML('beforeend', `<div>${key}</div>`);
            element.insertAdjacentHTML('beforeend', `<var data-format="${value.opts.format}"></var>`);
            if (value.opts.formatColor) {
                element.querySelectorForce('var').setAttribute('data-tag', value.opts.formatColor || '');
            }
            switch (value.opts.format) {
                case 'pct': element.insertAdjacentHTML('beforeend', '%'); break;
                case 'seconds': element.insertAdjacentHTML('beforeend', 's'); break;
            }
            content.appendChild(element);
        }
        header.insertAdjacentHTML('beforeend', `<i></i>`);
        header.addEventListener('click', () => {
            header.toggleAttribute('data-open');
            const stats = this.statistics.get(label);
            if (stats) {
                const container = accordion.closest('ul');
                if (container) {
                    this.updateHeaderContents(label, stats, container);
                }
            }
        });
        header.click(); //open by default
        return accordion;
    }

    private updateContainer(container: HTMLElement) {
        for (const [label, stats] of this.statistics) {
            const accordion = container.querySelector<HTMLElement>(`.g-accordion[data-name="${label}"]`);
            const isOpen = accordion?.querySelector('.header')?.hasAttribute('data-open');
            if (!isOpen || !accordion) {
                continue;
            }
            this.updateHeaderContents(label, stats, container);
            accordion.classList.toggle('hidden', accordion.querySelectorAll('[data-stat]:not(.hidden)').length === 0);
        }
    }

    private updateHeaderContents(name: string, stats: StatisticsObject['stats'], container: HTMLElement) {
        const accordion = container.querySelector<HTMLElement>(`[data-name="${name}"]`);
        if (!accordion || !accordion.querySelector('.header')?.hasAttribute('data-open')) {
            return;
        }
        Object.entries(stats).forEach(([key, value]) => {
            const element = accordion?.querySelector<HTMLElement>(`[data-stat="${key}"]`);
            const varElement = element?.querySelector('var');
            if (!element || !varElement) {
                return;
            }

            if (container === this.sideListContainer) {
                element.classList.toggle('hidden', !value.sticky);
            } else if (container === this.pageListContainer) {
                element.classList.toggle('hidden', value.get() === value.defaultValue)
            }
            varElement.textContent = this.formatVariableText(value);
        });
    }

    private formatVariableText(statistic: Statistic) {
        const value = statistic.get();
        const { format, decimals } = statistic.opts;
        let text = value.toFixed(decimals);
        switch (format) {
            case 'time':
                {
                    const date = new Date(0);
                    date.setSeconds(value);
                    text = date.toISOString().substring(11, 19);
                }
                break;
            case 'pct':
                text = (value * 100).toFixed(decimals);
                break;
        }
        return text;
    }

    save(saveObj: Save) {
        saveObj.statistics = {
            gameStatistics: this.createSaveObj(this.gameStats)
        }
    }

    createSaveObj<T extends Record<string, Statistic>>(stats: T) {
        return Object.entries(stats).reduce((a, [key, value]) => {
            a[key as keyof T] = { value: value.get(), sticky: value.sticky };
            return a;
        }, {} as Record<keyof T, StatisticSave>)
    }
}

export default new Statistics();


//save

export interface StatisticsSave {
    gameStatistics: Record<keyof GameStatistics['stats'], StatisticSave>;
}

export interface StatisticSave {
    value: number;
    sticky: boolean;
}
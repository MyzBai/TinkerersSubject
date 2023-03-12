import { querySelector } from "@src/utils/helpers";
import Value from "@utils/Value";
import { calcModTotal, Configuration } from "./calc/calcMod";
import Entity from "./Entity";
import Game, { Save } from "./Game";
import { KeywordModifierFlag } from "./mods";
import Player from "./Player";

interface StatisticsGroup {
    pageGroup: HTMLElement;
    sideGroup: HTMLElement;
    stats: StatisticsObject['stats'];
}

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
        this.sticky = this.opts.sticky || false;
    }
}

export class GameStatistics implements StatisticsObject {
    readonly stats = {
        'Time Played': new Statistic({ format: 'time' }),
        'Level': new Statistic({ sticky: true }),
        'Gold': new Statistic({ sticky: true, formatColor: 'gold' }),
        'Gold Generation': new Statistic({ sticky: true, format: 'seconds' }),
        'Gold Generated': new Statistic(),
    } as const;
}

export class EntityStatistics implements StatisticsObject {
    readonly stats = {
        'Dps': new Statistic({ sticky: true }),
        'Hit Chance': new Statistic({ sticky: true, format: 'pct' }),
        'Attack Speed': new Statistic({ sticky: true, decimals: 2 }),

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
    private statisticsGroups = new Map<string, StatisticsGroup>();
    private updateStatsCallback = (x: Entity) => this.updateGroup(x.name, x.stats);
    constructor() {
        this.pageListContainer = this.page.querySelectorForce('ul');
        this.sideListContainer = querySelector('.p-game .s-stats ul');
    }

    init() {
        Game.onSave.listen(this.save.bind(this));
        this.gameStats.Level.set(1);

        if (Game.saveObj?.statistics?.gameStatistics) {
            Object.entries(Game.saveObj?.statistics?.gameStatistics).forEach(([key, value]) => {
                const stat = this.gameStats[key as keyof GameStatistics['stats']] as Statistic | undefined;;
                if (stat) {
                    stat.set(value?.value || stat.defaultValue);
                    stat.sticky = value?.sticky || false;
                }
            });
        }

        Game.visiblityObserver.register(this.page, visible => {
            if (visible) {
                for (const key of this.statisticsGroups.keys()) {
                    this.updatePageGroup(key);
                }
            }
        });

        Player.onStatsUpdate.listen(() => {
            this.calcGlobalStats();
            this.updateGroup('Global', this.gameStats);
        });

        Game.entityHandler.onEntityChanged.listen(x => {
            if (Game.entityHandler.has(x.name)) {
                x.onStatsUpdate.listen(this.updateStatsCallback);
                this.createGroup(x.name, x.stats);
            } else {
                x.onStatsUpdate.removeListener(this.updateStatsCallback);
                this.removeGroup(x.name);
            }
        });

        this.createGroup('Global', this.gameStats);
    }

    updateAll() {
        this.updateGroup('Global', this.gameStats);
        Game.entityHandler.query(Entity).forEach(x => {
            this.updateGroup(x.name, x.stats);
        });
    }

    private createGroup(name: string, stats: StatisticsObject['stats']) {
        if (this.statisticsGroups.has(name)) {
            return;
        }

        const pageGroup = this.createPageListGroup(name, stats);
        const sideGroup = this.createSideListGroup(name, stats);
        if (!pageGroup || !sideGroup) {
            throw Error();
        }
        pageGroup.classList.remove('hidden');
        sideGroup.classList.remove('hidden');
        if (Game.saveObj?.statistics) {
            this.pageListContainer.querySelector(`[data-name="${name}"] .header`)?.toggleAttribute('data-open', Game.saveObj.statistics.groups?.[name]?.pageHeader);
            this.sideListContainer.querySelector(`[data-name="${name}"] .header`)?.toggleAttribute('data-open', Game.saveObj.statistics.groups?.[name]?.sideHeader);
        }
        this.statisticsGroups.set(name, { pageGroup, sideGroup, stats });
        this.updateGroup(name, stats);
    }

    private updateGroup(name: string, stats: StatisticsObject['stats']) {
        if (!this.statisticsGroups.has(name)) {
            const pageGroup = this.pageListContainer.querySelector<HTMLElement>(`[data-name="${name}"]`);
            const sideGroup = this.sideListContainer.querySelector<HTMLElement>(`[data-name="${name}"]`);
            if (!pageGroup || !sideGroup) {
                this.createGroup(name, stats);
                return;
            }
            this.statisticsGroups.set(name, { pageGroup, sideGroup, stats });
        }
        if (!this.page.classList.contains('hidden')) {
            this.updatePageGroup(name);
        }
        this.updateSideGroup(name);
    }

    removeGroup(name: string) {
        const group = this.statisticsGroups.get(name);
        group?.pageGroup.classList.add('hidden');
        group?.sideGroup.classList.add('hidden');
        this.statisticsGroups.delete(name);
    }

    private calcGlobalStats() {
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
        this.statisticsGroups.clear();
        this.pageListContainer.replaceChildren();
        this.sideListContainer.replaceChildren();
    }

    private createPageListGroup(label: string, stats: StatisticsObject['stats']) {
        const group = this.createAccordion(label, stats) || null;
        if (group) {
            this.pageListContainer.appendChild(group);
        }
        group?.querySelectorAll(`[data-stat]`).forEach(element => {
            const statName = element.getAttribute('data-stat') as keyof StatisticsObject['stats'];
            const stat = stats[statName];
            if (!stat) {
                return;
            }
            element.classList.toggle('selected', stat.sticky);
            element.addEventListener('click', () => {
                if (!stat) {
                    return;
                }
                stat.sticky = !stat.sticky;
                element.classList.toggle('selected', stat.sticky);
                const stats = this.statisticsGroups.get(label)?.stats;
                if (stats)
                    this.updateGroup(label, stats);
            });
        });
        return group;
    }

    private createSideListGroup(label: string, stats: StatisticsObject['stats']) {
        const group = this.createAccordion(label, stats) || null;
        if (group) {
            this.sideListContainer.appendChild(group);
        }
        return group;
    }

    private createAccordion(label: string, stats: StatisticsObject['stats']) {
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
            const group = this.statisticsGroups.get(label);
            if (group) {
                this.updatePageGroup(label);
                this.updateSideGroup(label);
            }
        });
        header.click(); //open by default
        return accordion;
    }

    private updatePageGroup(name: keyof StatisticsObject['stats']) {
        if (this.page.classList.contains('hidden')) {
            return;
        }
        const group = this.statisticsGroups.get(name);
        if (!group) {
            return;
        }
        for (const [key, stat] of Object.entries(group.stats)) {
            const element = group.pageGroup.querySelector<HTMLElement>(`[data-stat="${key}"]`);
            const varElement = element?.querySelector('var');
            if (!element || !varElement) {
                return;
            }
            element.classList.toggle('suppressed', stat.get() === stat.defaultValue);

            varElement.textContent = this.formatVariableText(stat);
        }
    }

    private updateSideGroup(name: keyof StatisticsObject['stats']) {
        const group = this.statisticsGroups.get(name);
        if (!group) {
            return;
        }
        for (const [key, stat] of Object.entries(group.stats)) {
            const element = group.sideGroup.querySelector<HTMLElement>(`[data-stat="${key}"]`);
            const varElement = element?.querySelector('var');
            if (!element || !varElement) {
                return;
            }
            element.classList.toggle('hidden', !stat.sticky);
            varElement.textContent = this.formatVariableText(stat);
        }
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
            gameStatistics: this.createStatsSaveObj(this.gameStats),
            groups: [...this.statisticsGroups.entries()].reduce((a, [key, group]) => {
                a[key] = {
                    pageHeader: group.pageGroup.querySelector('.header[data-open]') !== null,
                    sideHeader: group.sideGroup.querySelector('.header[data-open]') !== null
                };
                return a;
            }, {} as StatisticsSave['groups']),
        }
    }

    createStatsSaveObj<T extends Record<string, Statistic>>(stats: T) {
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
    groups: Record<string, { pageHeader: boolean; sideHeader: boolean }>;
}

export interface StatisticSave {
    value: number;
    sticky: boolean;
}
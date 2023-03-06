import type Statistics from "@src/game/Statistics";

export default interface StatisticsSave{
    statistics: Statistic[];
}

interface Statistic{
    name: keyof Statistics['statistics'];
    value: number;
    sticky: boolean;
}
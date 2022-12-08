import { visibilityObserver } from "@utils/Observers";
import Value from "@utils/Value";
import { gameLoop } from "./game";
import { Save } from "./save";

export type StatisticName = keyof typeof statistics;
interface StatisticsProperties {
    value: Value<number>;
    formatType?: 'time'
}
interface Statistics {
    [name: string]: StatisticsProperties;
}
const statistics: Statistics = {
    'Time Played': { value: new Value<number>(0), formatType: 'time' },
    'Gold Generated': { value: new Value<number>(0) },
    'Mana Generated': { value: new Value<number>(0) },
    'Hits': { value: new Value<number>(0) },
    'Critical Hits': { value: new Value<number>(0) },
    'Total Damage': { value: new Value<number>(0) },
    'Total Physical Damage': { value: new Value<number>(0) },
    'Prestige Count': { value: new Value<number>(0) },
} as const;

type StatisticKeys = keyof typeof statistics;

let updateId: number = undefined;

visibilityObserver(document.querySelector('.p-game .p-statistics'), handleUpdateLoop);

function handleUpdateLoop(visible: boolean) {
    if (visible) {
        Object.entries(statistics).forEach(([key, value]) => updateGameStatistics(key, value.value));
        updateId = gameLoop.subscribe(() =>
            Object.entries(statistics).forEach(([key, value]) =>
                updateGameStatistics(key, value.value)),
            { intervalMilliseconds: 1000 });
    } else {
        gameLoop.unsubscribe(updateId);
    }
}

export function createStatisticsElements() {
    const elements: HTMLLIElement[] = [];

    const createField = (key: StatisticKeys) => {
        const element = document.createElement('li');
        element.classList.add('g-field', 'hidden');
        const label = document.createElement('div');
        element.appendChild(label);
        const value = document.createElement('var');
        element.appendChild(value);
        label.textContent = key as string;
        value.setAttribute('data-stat', key as string);
        value.setAttribute('data-format-type', statistics[key].formatType || '');
        return element;
    }
    for (const key of Object.keys(statistics)) {
        const element = createField(key);
        elements.push(element);
    }
    document.querySelector('.p-statistics ul').replaceChildren(...elements);
}

function updateGameStatistics(key: StatisticKeys, value: Value<number>) {
    const element = document.querySelector(`.p-statistics [data-stat="${key}"]`);
    if (!element) {
        return;
    }
    const valueZero = value.get() === 0;
    element.parentElement.classList.toggle('hidden', valueZero);
    if (valueZero) {
        return;
    }
    const type = element.getAttribute('data-format-type');
    switch (type) {
        case 'time':
            const date = new Date(null);
            date.setSeconds(value.get());
            const str = date.toISOString().substring(11, 19);
            element.textContent = str;
            break;
        default:
            element.textContent = value.get().toFixed(0);
    }
}

export function saveStatistics(saveObj: Save) {
    saveObj.statistics = Object.entries(statistics).map(([key, value]) => {
        return {
            name: key,
            value: value.value.get()
        }
    });
}

export function loadStatistics(saveObj: Save) {
    saveObj.statistics.forEach(x => statistics[x.name].value.set(x.value));
}

export default Object.fromEntries(Object.keys(statistics).map(x => [x, statistics[x].value]));
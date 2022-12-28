import { visibilityObserver } from "@utils/Observers";
import Value from "@utils/Value";
import { gameLoop } from "./game";
import type { Save } from "./saveGame";

class Statistic extends Value {
    readonly hidden: boolean;
    constructor(defaultValue: number, hidden?: boolean) {
        super(defaultValue);
        this.hidden = hidden || false;
    }
}

const statistics = {
    'Time Played': new Statistic(0),
    'Gold Generated': new Statistic(0),
    'Mana Generated': new Statistic(0),
    'Hits': new Statistic(0),
    'Critical Hits': new Statistic(0),
    'Total Damage': new Statistic(0),
    'Total Physical Damage': new Statistic(0),
    'Prestige Count': new Statistic(0),
} as const;

export default statistics;

let updateId = 0;

visibilityObserver(document.querySelector('.p-game .p-statistics')!, handleUpdateLoop);

function handleUpdateLoop(visible: boolean) {
    if (visible) {
        Object.entries(statistics).forEach(([key, value]) => updateGameStatistics(key, value));
        updateId = gameLoop.subscribe(() =>
            Object.entries(statistics).forEach(([key, value]) =>
                updateGameStatistics(key, value)),
            { intervalMilliseconds: 1000 });
    } else {
        gameLoop.unsubscribe(updateId);
    }
}

export function createStatisticsElements() {
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
        value.setAttribute('data-format-type', getFormatType(key as keyof typeof statistics));
        return element;
    }
    for (const key of Object.keys(statistics)) {
        const element = createField(key as string);
        elements.push(element);
    }
    document.querySelector('.p-statistics ul')!.replaceChildren(...elements);
}

function getFormatType(key: keyof typeof statistics) {
    switch (key) {
        case 'Time Played': return 'time';
    }
    return '';
}

function updateGameStatistics(key: string, value: Value) {
    const element = document.querySelector(`.p-statistics [data-stat="${key}"]`);
    if (!element) {
        return;
    }
    const valueZero = value.get() === 0;
    element.parentElement?.classList.toggle('hidden', valueZero);
    if (valueZero) {
        return;
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

export function saveStatistics(saveObj: Save) {
    saveObj.statistics = Object.entries(statistics).map(([key, value]) => {
        return {
            name: key,
            value: value.get()
        }
    });
}

export function loadStatistics(saveObj: Save) {
    saveObj.statistics?.forEach(x => {
        statistics[x.name as keyof typeof statistics]?.set(x.value);
    });
}
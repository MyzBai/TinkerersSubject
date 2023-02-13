import { playerStats } from "./player";
import statistics from "./statistics";

type TaskValidators = [RegExp, () => string];
const taskValidators: TaskValidators[] = [
    [/^Reach Level {(\d+)}$/, () => playerStats.level.get().toFixed()],
    [/^Prestige {\d+}?$/, () => statistics["Prestige Count"].get().toFixed()],
    [/^Deal Damage {(\d+)}$/, () => statistics["Total Damage"].get().toFixed()],
    [/^Deal Physical Damage {(\d+)}$/, () => statistics["Total Physical Damage"].get().toFixed()],
    [/^Perform Hits {(\d+)}$/, () => statistics.Hits.get().toFixed()],
    [/^Perform Critical Hits {(\d+)}$/, () => statistics["Critical Hits"].get().toFixed()],
    [/^Generate Gold {(\d+)}$/, () => statistics["Gold Generated"].get().toFixed()],
    [/^Regenerate Mana {(\d+)}$/, () => statistics["Mana Generated"].get().toFixed()],
];

export default class Task {
    public text: string;
    public description: string;
    private startValue: number;
    private targetValue: number;
    private validator: TaskValidators;

    constructor(text: string) {
        this.text = text;
        this.description = text.replace(/[{}]*/g, '');
        const validator = taskValidators.find(x => x[0].exec(text));
        if (!validator) {
            throw Error(`Task.ts: ${text} is an invalid task string`);
        }

        const match = validator[0].exec(text) as RegExpMatchArray;
        this.targetValue = parseFloat(match[1]);
        this.startValue = parseFloat(validator[1]());
        this.validator = validator;
    }

    validate(){
        return parseFloat(this.validator[1]()) >= this.startValue - this.targetValue; 
    }
}
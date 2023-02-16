import { remap } from "@src/utils/helpers";
import type Game from "./Game";

type TaskValidators = [RegExp, () => string];


interface TextData {
    labelText: string;
    valueText: string;
}

export default class Task {
    public text: string;
    public description: string;
    public textData: TextData;
    public startValue: number;
    private _targetValue: number;
    private validator: TaskValidators;

    private taskValidators: TaskValidators[] = [
        [/^Reach Level {(\d+)}$/, () => this.game.player.stats.level.get().toFixed()],
        [/^Prestige {\d+}?$/, () => this.game.statistics.statistics["Prestige Count"].get().toFixed()],
        [/^Deal Damage {(\d+)}$/, () => this.game.statistics.statistics["Total Damage"].get().toFixed()],
        [/^Deal Physical Damage {(\d+)}$/, () => this.game.statistics.statistics["Total Physical Damage"].get().toFixed()],
        [/^Perform Hits {(\d+)}$/, () => this.game.statistics.statistics.Hits.get().toFixed()],
        [/^Perform Critical Hits {(\d+)}$/, () => this.game.statistics.statistics["Critical Hits"].get().toFixed()],
        [/^Generate Gold {(\d+)}$/, () => this.game.statistics.statistics["Gold Generated"].get().toFixed()],
        [/^Regenerate Mana {(\d+)}$/, () => this.game.statistics.statistics["Mana Generated"].get().toFixed()],
    ];

    constructor(readonly game: Game, text: string) {
        this.text = text;
        this.description = text.replace(/[{}]*/g, '');

        const validator = this.taskValidators.find(x => x[0].exec(text));
        if (!validator) {
            throw Error(`Task.ts: ${text} is an invalid task string`);
        }

        const match = validator[0].exec(text) as RegExpMatchArray;
        this.startValue = parseFloat(validator[1]());
        this._targetValue = parseFloat(match[1]);
        this.validator = validator;

        const valueIndex = text.indexOf(`{${match[1]}}`);
        this.textData = {
            labelText: this.description.substring(0, valueIndex - 1),
            valueText: match[1]
        }
    }

    get targetValue() {
        return this._targetValue;
    }
    get value() {
        const endValue = this.startValue + this._targetValue;
        const value = parseFloat(this.validator[1]());
        return remap(this.startValue, endValue, 0, this._targetValue, value);
    }
    get completed() {
        return this.value >= this._targetValue;
    }
}
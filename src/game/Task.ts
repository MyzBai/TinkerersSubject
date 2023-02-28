import { remap } from "@src/utils/helpers";
import type Value from "@src/utils/Value";
import type Game from "./Game";

type TaskValidators = [RegExp, Value];


interface TextData {
    labelText: string;
    valueText: string;
}

export default class Task {
    public readonly text: string;
    public readonly description: string;
    public readonly textData: TextData;
    public startValue: number;
    private readonly _targetValue: number;
    public readonly validator: TaskValidators;

    private readonly taskValidators: TaskValidators[] = [];

    constructor(readonly game: Game, text: string) {
        this.taskValidators = [
            [/^Reach Level {(\d+)}$/, this.game.player.stats.level],
            [/^Prestige {\d+}?$/, this.game.statistics.statistics["Prestige Count"]],
            [/^Deal Damage {(\d+)}$/, this.game.statistics.statistics["Total Damage"]],
            [/^Deal Physical Damage {(\d+)}$/, this.game.statistics.statistics["Total Physical Damage"]],
            [/^Deal Elemental Damage {(\d+)}$/, this.game.statistics.statistics["Total Elemental Damage"]],
            [/^Perform Hits {(\d+)}$/, this.game.statistics.statistics.Hits],
            [/^Perform Critical Hits {(\d+)}$/, this.game.statistics.statistics["Critical Hits"]],
            [/^Generate Gold {(\d+)}$/, this.game.statistics.statistics["Gold Generated"]],
            [/^Regenerate Mana {(\d+)}$/, this.game.statistics.statistics["Mana Generated"]],
        ];
        this.text = text;
        this.description = text.replace(/[{}]*/g, '');

        this.validator = this.taskValidators.find(x => x[0].exec(text))!;
        if (!this.validator) {
            throw Error(`Task.ts: ${text} is an invalid task string`);
        }

        const match = this.validator[0].exec(text) as RegExpMatchArray;
        if(!match[1]){
            throw Error('invalid task validator');
        }
        this.startValue = parseFloat((this.validator[1].get() - this.validator[1].defaultValue).toFixed());
        this._targetValue = parseFloat(match[1]);

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
        const value = parseFloat(this.validator[1].get().toFixed());
        return remap(this.startValue, endValue, 0, this._targetValue, value);
    }
    get completed() {
        return this.value >= this._targetValue;
    }
}
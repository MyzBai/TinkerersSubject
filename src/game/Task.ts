import { remap } from "@src/utils/helpers";
import type Value from "@src/utils/Value";
import Player from "./Player";
import Statistics from "./Statistics";

interface TextData {
    labelText: string;
    valueText: string;
}

class Validator {
    constructor(readonly regex: RegExp, readonly value: Value) {

    }
}

export default class Task {
    public readonly text: string;
    public readonly description: string;
    public readonly textData: TextData;
    public startValue: number;
    private readonly _targetValue: number;
    public readonly validator: Validator;

    private readonly taskValidators: Validator[];

    constructor(text: string) {
        this.taskValidators = [
            new Validator(/^Reach Level {(\d+)}$/, Statistics.gameStats.Level),
            new Validator(/^Deal Damage {(\d+)}$/, Statistics.gameStats["Total Damage"]),
            new Validator(/^Deal Physical Damage {(\d+)}$/, Statistics.gameStats["Total Physical Damage"]),
            new Validator(/^Deal Elemental Damage {(\d+)}$/, Statistics.gameStats["Total Elemental Damage"]),
            new Validator(/^Deal Bleed Damage {(\d+)}$/, Statistics.gameStats["Total Bleed Damage"]),
            new Validator(/^Deal Burn Damage {(\d+)}$/, Statistics.gameStats["Total Burn Damage"]),
            new Validator(/^Perform Hits {(\d+)}$/, Player.stats.Hits),
            new Validator(/^Perform Critical Hits {(\d+)}$/, Player.stats["Critical Hits"]),
            new Validator(/^Generate Gold {(\d+)}$/, Statistics.gameStats["Gold Generated"]),
            new Validator(/^Regenerate Mana {(\d+)}$/, Player.stats["Mana Generated"]),
        ];
        this.text = text;
        this.description = text.replace(/[{}]*/g, '');

        const validator = this.taskValidators.find(x => x.regex.exec(text));
        if (!validator) {
            throw Error(`Task.ts: ${text} is an invalid task string`);
        }
        this.validator = validator;

        const match = this.validator.regex.exec(text) as RegExpMatchArray;
        if (!match[1]) {
            throw Error('invalid task validator');
        }
        this.startValue = parseFloat((this.validator.value.get() - this.validator.value.defaultValue).toFixed());
        this._targetValue = parseFloat(match[1]);

        const valueIndex = text.indexOf(`{${match[1]}}`);
        this.textData = {
            labelText: this.description.substring(0, valueIndex - 1),
            valueText: match[1]
        };
    }

    get targetValue() {
        return this._targetValue;
    }
    get value() {
        const endValue = this.startValue + this._targetValue;
        const value = parseFloat(this.validator.value.get().toFixed());
        return remap(this.startValue, endValue, 0, this._targetValue, value);
    }
    get completed() {
        return this.value >= this._targetValue;
    }
}
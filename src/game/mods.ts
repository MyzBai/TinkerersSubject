import type { Mod } from "@src/types/gconfig";
import EventEmitter from "@utils/EventEmitter";

//#region Types
export type ModifierTag = 'Gold' | 'Physical' | 'Speed' | 'Mana' | 'Critical';
export type StatModifierValueType = 'Base' | 'Inc' | 'More';
//#region Mod Description
export type ModDescription =
    | '#% Increased Physical Damage'
    | '#% More Physical Damage'
    | '#% More Damage'
    | 'Adds # To # Physical Damage'
    | '+#% Hit Chance'
    | '#% Increased Attack Speed'
    | '#% More Attack Speed'
    | '#% Increased Maximum Mana'
    | '+# Maximum Mana'
    | '+# Mana Regeneration'
    | '+#% Critical Hit Chance'
    | '+#% Critical Hit Multiplier'
    | '+# Gold Per Second'
    | '#% Increased Gold Per Second'
    | '#% Increased Skill Duration'
    ;

//#endregion Mod Description

//#region Stat Name
export type StatName =
    | 'GoldPerSecond'
    | DamageStatName
    | 'AttackManaCost'
    | 'AttackSpeed'
    | 'HitChance'
    | 'CritChance'
    | 'CritMulti'
    | 'ManaRegen'
    | 'MaxMana'
    | 'Gold'
    | 'Duration';
//#endregion Stat Name

//#region Damage Stat Name
type DamageStatName =
    'BaseDamageMultiplier' |
    'Damage' |
    'MinDamage' |
    'MaxDamage' |
    'ElementalConvertedToPhysical' |
    'ChaosConvertedToPhysical' |
    'ChaosConvertedToElemental' |
    'ChaosConvertedToChaos' | ConversionStatName | GainAsStatName;

export type ConversionStatName = 'ElementalConvertedToPhysical' | 'ChaosConvertedToPhysical' | 'ChaosConvertedToElemental';
export type GainAsStatName = 'ElementalGainAsPhysical' | 'ChaosGainAsElemental' | 'ChaosGainAsPhysical';
//#endregion Damage Stat Name

//#endregion Types

interface ModTemplate {
    readonly desc: ModDescription;
    readonly tags?: ModifierTag[],
    readonly stats: {
        readonly name: StatName;
        readonly valueType: StatModifierValueType;
        readonly flags?: number;
    }[];
}

interface StatModifierParams {
    name: StatName;
    valueType: StatModifierValueType;
    value: number;
    flags?: number;
    min?: number;
    max?: number;
    source?: string;
}

export const StatModifierFlags = {
    None: 1 << 0,
    Attack: 1 << 1,
    Physical: 1 << 2,
    Elemental: 1 << 3,
    Chaos: 1 << 4,
    Skill: 1 << 5
} as const;

export const modTemplates: ModTemplate[] = [
    {
        desc: '#% Increased Physical Damage',
        tags: ['Physical'],
        stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlags.Physical }]
    },
    {
        desc: '#% More Physical Damage',
        tags: ['Physical'],
        stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlags.Physical }]
    },
    {
        desc: '#% More Damage',
        tags: [],
        stats: [{ name: 'Damage', valueType: 'More' }]
    },
    {
        desc: 'Adds # To # Physical Damage',
        tags: ['Physical'],
        stats: [{ name: 'MinDamage', valueType: 'Base', flags: StatModifierFlags.Physical },
        { name: 'MaxDamage', valueType: 'Base', flags: StatModifierFlags.Physical }]
    },
    {
        desc: '+#% Hit Chance',
        stats: [{ name: 'HitChance', valueType: 'Base' }]
    },
    {
        desc: '#% Increased Attack Speed',
        tags: ['Speed'],
        stats: [{ name: 'AttackSpeed', valueType: 'Inc' }]
    },
    {
        desc: '#% More Attack Speed',
        tags: ['Speed'],
        stats: [{ name: 'AttackSpeed', valueType: 'More' }]
    },
    {
        desc: '#% Increased Maximum Mana',
        tags: ['Mana'],
        stats: [{ name: 'MaxMana', valueType: 'Inc' }]
    },
    {
        desc: '+# Maximum Mana',
        tags: ['Mana'],
        stats: [{ name: 'MaxMana', valueType: 'Base' }]
    },
    {
        desc: '+# Mana Regeneration',
        tags: ['Mana'],
        stats: [{ name: 'ManaRegen', valueType: 'Base' }]
    },
    {
        desc: '+#% Critical Hit Chance',
        tags: ['Critical'],
        stats: [{ name: 'CritChance', valueType: 'Base' }]
    },
    {
        desc: '+#% Critical Hit Multiplier',
        tags: ['Critical'],
        stats: [{ name: 'CritMulti', valueType: 'Base' }]
    },
    {
        desc: '+# Gold Per Second',
        tags: ['Gold'],
        stats: [{ name: 'GoldPerSecond', valueType: 'Base' }],
    },
    {
        desc: '#% Increased Gold Per Second',
        tags: ['Gold'],
        stats: [{ name: 'GoldPerSecond', valueType: 'Inc' }],
    },
    {
        desc: '#% Increased Skill Duration',
        tags: ['Gold'],
        stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlags.Skill }],
    },
];

export class Modifier {

    readonly text: Mod;
    readonly template: ModTemplate;
    readonly tags: ModifierTag[] = [];
    readonly stats: StatModifier[] = [];
    constructor(text: Mod) {
        this.text = text;
        const match = [...text.matchAll(/{(?<v1>\d+(\.\d+)?)(-(?<v2>\d+(\.\d+)?))?\}/g)];
        const desc = text.replace(/{[^}]+}/g, '#');
        this.template = modTemplates.find((x) => x.desc === desc);
        if (!this.template) {
            throw Error('Failed to find mod template. Invalid mod description');
        }
        this.tags = this.template.tags;

        // this.#template = template;
        // this.#tags = [...template?.tags || []];

        for (const statTemplate of this.template.stats) {
            const groups = match[this.template.stats.indexOf(statTemplate)].groups;
            if (!groups) {
                throw Error();
            }
            const { v1, v2 } = groups;
            const min = parseFloat(v1);
            const max = parseFloat(v2) || min;
            const value = min;
            this.stats.push(new StatModifier({ name: statTemplate.name, valueType: statTemplate.valueType, value, min, max, flags: statTemplate.flags || 0 }));
        }
    }

    get templateDesc() { return this.template.desc; }

    get desc() {
        let i = 0;
        return this.templateDesc.replace(/#+/g, (x) => {
            const stat = this.stats[i++];
            const value = stat.value?.toFixed(x.length - 1) || '#';
            return value;
        });
    }

    static compare(a: Modifier, b: Modifier) {
        return a.compare(b);
    }
    static sort(a: Modifier, b: Modifier) {
        return a.sort(b);
    }
    sort(other: Modifier){
        return modTemplates.findIndex(x => x.desc === this.templateDesc) - modTemplates.findIndex(x => x.desc === other.templateDesc);
    }

    compare(other: Modifier) {
        return this.templateDesc === other.templateDesc;
    }

    copy() {
        return new Modifier(this.text);
    }
    setStatValues(values: number[]){
        if(this.stats.length !== values.length){
            return;
        }
        this.stats.forEach((x,i) => x.value = values[i]);
        return true;
    }
}

export class StatModifier {

    readonly name: StatName;
    readonly valueType: StatModifierValueType;
    value: number;
    readonly flags?: number;
    readonly min?: number;
    readonly max?: number;
    source?: string;
    constructor(params: StatModifierParams) {
        Object.assign(this, params);
    }

    randomizeValue() {
        this.value = Math.random() * (this.max - this.min) + this.min;
    }
}

export class ModDB {
    private _modList: StatModifier[];
    public readonly onChange: EventEmitter<StatModifier[]>;
    constructor() {
        this._modList = [];
        this.onChange = new EventEmitter<StatModifier[]>();
    }

    get modList() { return this._modList; }

    add(statMods: StatModifier[], source: string) {
        statMods.forEach(x => x.source = source);
        this.modList.push(...statMods);
        this.onChange.invoke([...this.modList]);
    }

    removeBySource(source: string) {
        this._modList = this.modList.filter(x => !x || x.source != source);
        this.onChange.invoke([...this.modList]);
    }

    clear() {
        this._modList = [];
        this.onChange.invoke([...this.modList]);
    }


}
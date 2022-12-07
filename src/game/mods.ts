import { Mod } from "@public/gconfig/schema";
import EventEmitter from "@utils/EventEmitter";

//#region Types
export type StatName =
    'GoldPerSecond' |
    DamageStatName |
    'AttackManaCost' |
    'AttackSpeed' |
    'HitChance' |
    'CritChance' |
    'CritMulti' |
    'ManaRegen' |
    'MaxMana' |
    'Gold';

type DamageStatName =
    'BaseDamageMultiplier' |
    'Damage' |
    'MinDamage' |
    'MaxDamage' |
    'MinPhysicalDamage' |
    'MaxPhysicalDamage' |
    'MinElementalDamage' |
    'MaxElementalDamage' |
    'MinChaosDamage' |
    'MaxChaosDamage' |
    'ElementalConvertedToPhysical' |
    'ChaosConvertedToPhysical' |
    'ChaosConvertedToElemental' |
    'ChaosConvertedToChaos' | ConversionStatName | GainAsStatName;

export type ConversionStatName = 'ElementalConvertedToPhysical' | 'ChaosConvertedToPhysical' | 'ChaosConvertedToElemental';
export type GainAsStatName = 'ElementalGainAsPhysical' | 'ChaosGainAsElemental' | 'ChaosGainAsPhysical';

export type ModifierTag = 'Gold' | 'Physical' | 'Speed' | 'Mana' | 'Critical';
export type StatModifierValueType = 'Base' | 'Inc' | 'More';

//#endregion

export const StatModifierFlags = {
    None: 1 << 0,
    Attack: 1 << 1,
    Physical: 1 << 2,
    Elemental: 1 << 3,
    Chaos: 1 << 4
} as const;

interface ModTemplate {
    desc: string;
    tags?: ModifierTag[],
    stats: {
        name: StatName;
        valueType: StatModifierValueType;
        flags?: number;
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

export const modTemplates: ModTemplate[] = [
    {
        desc: '+# Gold Per Second',
        tags: ['Gold'],
        stats: [{ name: 'GoldPerSecond', valueType: 'Base' }],
    },
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
    }
];

export class Modifier {

    #text: Mod;
    #template: ModTemplate;
    #tags: ModifierTag[] = [];
    #stats: StatModifier[] = [];

    constructor(text: Mod) {
        this.#text = text;
        const match = [...text.matchAll(/{(?<v1>\d+(\.\d+)?)(-(?<v2>\d+(\.\d+)?))?\}/g)];
        const desc = text.replace(/{[^}]+}/g, '#');
        const template = modTemplates.find((x: ModTemplate) => x.desc === desc) as ModTemplate;

        this.#template = template;
        this.#tags = [...template?.tags || []];

        for (const statTemplate of template.stats) {
            const groups = match[template.stats.indexOf(statTemplate)].groups;
            if (!groups) {
                throw Error();
            }
            const { v1, v2 } = groups;
            const min = parseFloat(v1);
            const max = parseFloat(v2) || min;
            const value = min;
            this.#stats.push(new StatModifier({ name: statTemplate.name, valueType: statTemplate.valueType, value, min, max, flags: statTemplate.flags || 0 }));
        }
    }

    get desc() {
        let i = 0;
        return this.templateDesc.replace(/#+/g, (x) => {
            const stat = this.#stats[i++];
            const value = stat.value?.toFixed(x.length - 1) || '#';
            return value;
        });
    }

    get templateDesc() {
        return this.#template.desc;
    }
    get tags() {
        return [...this.#tags]
    }
    get stats() {
        return this.#stats;
    }

    compare(other: Modifier) {
        return modTemplates.findIndex(x => x.desc === this.templateDesc) - modTemplates.findIndex(x => x.desc === other.templateDesc);
    }
    static compare(a: Modifier, b: Modifier){
        return a.compare(b);
    }
    copy() {
        return new Modifier(this.#text);
    }
}

export class StatModifier {

    #name: StatName;
    #valueType: StatModifierValueType;
    #value: number;
    #flags?: number;
    #min?: number;
    #max?: number;
    #source?: string;
    constructor(params: StatModifierParams) {
        this.#name = params.name;
        this.#valueType = params.valueType;
        this.#flags = params.flags;
        this.#min = params.min;
        this.#max = params.max;
        this.#value = params.value;
        this.#source = params.source;
    }

    get name() { return this.#name; }
    get valueType() { return this.#valueType; }
    get flags() { return this.#flags; }
    get min() { return this.#min; }
    get max() { return this.#max; }
    get value() { return this.#value; }
    set value(v) { this.#value = v; }

    get source() { return this.#source; }
    set source(v: string | undefined) { this.#source = v; }

    randomizeValue(){
        this.#value = Math.random() * (this.#max - this.#min) + this.#min;
    }
}

export class ModDB {
    #modList: StatModifier[];
    #onChange = new EventEmitter<StatModifier[]>();
    constructor() {
        this.#modList = [];
    }

    get modList() {
        return this.#modList;
    }
    get onChange() { return this.#onChange; }


    add(statMods: StatModifier[], source) {
        statMods.forEach(x => x.source = source);
        this.#modList.push(...statMods);
        this.#onChange.invoke([...this.modList]);
    }

    removeBySource(source: string) {
        this.#modList = this.#modList.filter(x => !x || x.source != source);
        this.#onChange.invoke([...this.modList]);
    }

    clear() {
        this.#modList.splice(0);
        this.#onChange.invoke([...this.modList]);
    }

 
}
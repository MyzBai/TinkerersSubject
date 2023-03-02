import type { Mod } from "@src/types/gconfig";
import EventEmitter from "@utils/EventEmitter";

//#region Types
export type ModifierTag = 'Gold' | 'Physical' | 'Elemental' | 'Speed' | 'Mana' | 'Critical' | 'Ailment' | 'Bleed' | 'Burn' | 'Duration';
export type StatModifierValueType = 'Base' | 'Inc' | 'More';
//#region Mod Description
export type ModDescription = typeof modTemplates[number]['desc'];
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
    | 'AilmentStack'
    | 'BleedChance'
    | 'BurnChance'
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

interface ModTemplateStats {
    readonly name: StatName;
    readonly valueType: StatModifierValueType;
    readonly flags?: number;
};
interface ModTemplate {
    readonly desc: string;
    readonly tags: ReadonlyArray<ModifierTag>,
    readonly stats: ReadonlyArray<ModTemplateStats>;
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
    Skill: 1 << 5,
    Ailment: 1 << 6,
    Bleed: 1 << 7,
    Burn: 1 << 8
} as const;

export const modTemplates: ReadonlyArray<ModTemplate> = [
    {
        desc: '#% Increased Physical Damage',
        tags: ['Physical'],
        stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlags.Physical }]
    },
    {
        desc: '#% Increased Elemental Damage',
        tags: ['Elemental'],
        stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlags.Elemental }]
    },
    {
        desc: '#% More Physical Damage',
        tags: ['Physical'],
        stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlags.Physical }]
    },
    {
        desc: '#% More Elemental Damage',
        tags: ['Elemental'],
        stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlags.Elemental }]
    },
    {
        desc: '#% More Bleed Damage',
        tags: ['Bleed', 'Physical'],
        stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlags.Physical | StatModifierFlags.Bleed }],
    },
    {
        desc: '#% More Burn Damage',
        tags: ['Burn', 'Elemental'],
        stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlags.Elemental | StatModifierFlags.Burn }],
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
        desc: 'Adds # To # Elemental Damage',
        tags: ['Elemental'],
        stats: [{ name: 'MinDamage', valueType: 'Base', flags: StatModifierFlags.Elemental },
        { name: 'MaxDamage', valueType: 'Base', flags: StatModifierFlags.Elemental }]
    },
    {
        desc: '#% Increased Bleed Damage',
        tags: ['Bleed', 'Physical'],
        stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlags.Physical | StatModifierFlags.Bleed }],
    },
    {
        desc: '#% Increased Burn Damage',
        tags: ['Burn', 'Elemental'],
        stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlags.Elemental | StatModifierFlags.Burn }],
    },
    {
        desc: '+#% Hit Chance',
        tags: [],
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
    {
        desc: '+#% Chance To Bleed',
        tags: ['Bleed', 'Physical'],
        stats: [{ name: 'BleedChance', valueType: 'Base', flags: StatModifierFlags.Bleed }],
    },
    {
        desc: '+#% Chance To Burn',
        tags: ['Burn', 'Elemental'],
        stats: [{ name: 'BurnChance', valueType: 'Base', flags: StatModifierFlags.Burn }],
    },
    {
        desc: '+# Bleed Duration',
        tags: ['Duration', 'Bleed'],
        stats: [{ name: 'Duration', valueType: 'Base', flags: StatModifierFlags.Bleed }],
    },
    {
        desc: '#% Increased Bleed Duration',
        tags: ['Duration', 'Bleed'],
        stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlags.Bleed }],
    },
    {
        desc: '+# Burn Duration',
        tags: ['Duration', 'Burn'],
        stats: [{ name: 'Duration', valueType: 'Base', flags: StatModifierFlags.Burn }],
    },
    {
        desc: '#% Increased Burn Duration',
        tags: ['Duration', 'Burn'],
        stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlags.Burn }],
    },
    {
        desc: '+# Maximum Bleed Stack',
        tags: ['Bleed', 'Ailment'],
        stats: [{ name: 'AilmentStack', valueType: 'Base', flags: StatModifierFlags.Bleed }],
    },
    {
        desc: '+# Maximum Burn Stack',
        tags: ['Burn', 'Ailment'],
        stats: [{ name: 'AilmentStack', valueType: 'Base', flags: StatModifierFlags.Burn }],
    }
];

export class Modifier {
    readonly text: Mod;
    readonly template: ModTemplate;
    readonly stats: StatModifier[] = [];
    constructor(text: Mod) {

        this.text = text;

        const parsedData = Modifier.parseText(text);
        this.template = parsedData.template;
        this.stats = parsedData.stats;
    }

    get tags() { return this.template.tags }

    get templateDesc() { return this.template.desc; }

    get desc() {
        return Modifier.parseDescription(this.template.desc, this.stats);
    }

    static compare(a: Modifier, b: Modifier) {
        return a.compare(b);
    }
    static sort(a: Modifier, b: Modifier) {
        return a.sort(b);
    }

    static parseText(text: string) {
        const match = [...text.matchAll(/{(?<v1>\d+(\.\d+)?)(-(?<v2>\d+(\.\d+)?))?\}/g)];
        const desc = text.replace(/{[^}]+}/g, '#');
        const template = modTemplates.find(x => x.desc === desc);
        if (!template) {
            throw Error(`Failed to find mod template. Invalid mod description: ${text}`);
        }
        const stats: StatModifier[] = [];
        for (const [index, statTemplate] of template.stats.entries()) {
            const matchValue = match[index];
            if (!matchValue || !matchValue.groups) {
                throw Error('invalid modifier');
            }
            const { v1, v2 } = matchValue.groups;
            if (!v1) {
                throw Error('invalid modifier');
            }
            const min = parseFloat(v1);
            const max = v2 ? parseFloat(v2) : min;
            const value = min;
            stats.push(new StatModifier({ name: statTemplate.name, valueType: statTemplate.valueType, value, min, max, flags: statTemplate.flags || 0 }));
        }
        return { template, stats };
    }

    static parseDescription(desc: ModTemplate['desc'], stats: StatModifier[]) {
        let i = 0;
        return desc.replace(/#+/g, (x) => {
            const stat = stats[i++];
            if (!stat) {
                throw Error('invalid mod description');
            }
            const value = stat.value.toFixed(x.length - 1) || '#';
            return value;
        });
    }

    sort(other: Modifier) {
        return modTemplates.findIndex(x => x.desc === this.templateDesc) - modTemplates.findIndex(x => x.desc === other.templateDesc);
    }

    compare(other: Modifier) {
        return this.templateDesc === other.templateDesc;
    }

    copy() {
        return new Modifier(this.text);
    }
}

export class StatModifier {

    readonly name: StatName;
    readonly valueType: StatModifierValueType;
    value: number;
    readonly flags: number;
    readonly min: number;
    readonly max: number;
    source?: string;
    constructor(data: StatModifierParams) {
        this.name = data.name;
        this.valueType = data.valueType;
        this.value = data.value;
        this.flags = data.flags || 0;
        this.min = data.min || this.value;
        this.max = data.max || this.value || this.min;
        this.source = data.source;
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
        this._modList = this.modList.filter(x => x.source !== source);
        this.onChange.invoke([...this.modList]);
    }

    clear() {
        this._modList = [];
        this.onChange.invoke([...this.modList]);
    }


}
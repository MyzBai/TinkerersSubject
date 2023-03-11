import EventEmitter from "@utils/EventEmitter";

//#region Types
export type ModifierTag =
    | 'Global'
    | 'Gold'
    | 'Damage'
    | 'Attack'
    | 'Physical'
    | 'Elemental'
    | 'Speed'
    | 'Mana'
    | 'Critical'
    | 'Ailment'
    | 'Bleed'
    | 'Burn'
    | 'Duration'
    | 'Skill'
    | 'Minion';
export type StatModifierValueType = 'Base' | 'Inc' | 'More';
//#region Mod Description
export type ModDescription = typeof modTemplates[number]['desc'];
//#endregion Mod Description

//#region Stat Name
export type StatName =
    | 'GoldGeneration'
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
    | 'Duration'
    | 'MinionCount';
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
    readonly keywords?: number;
}
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
    keywords?: number;
}

export enum StatModifierFlag {
    None = 0,
    Attack = 1 << 0,
    Physical = 1 << 1,
    Elemental = 1 << 2,
    Chaos = 1 << 3,
    Skill = 1 << 4,
    Bleed = 1 << 5,
    Burn = 1 << 6,
    Damage = 1 << 7
}

export enum KeywordModifierFlag {
    None = 0,
    Global = 1 << 0,
    Minion = 1 << 1
}

export const modTemplates: ReadonlyArray<ModTemplate> = [
    { desc: '#% Increased Physical Damage', tags: ['Damage', 'Physical'], stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlag.Physical }] },
    { desc: '#% Increased Elemental Damage', tags: ['Damage', 'Elemental'], stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlag.Elemental }] },
    { desc: '#% More Physical Damage', tags: ['Damage', 'Physical'], stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlag.Physical }] },
    { desc: '#% More Elemental Damage', tags: ['Damage', 'Elemental'], stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlag.Elemental }] },
    { desc: '#% More Bleed Damage', tags: ['Damage', 'Bleed', 'Physical', 'Ailment'], stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlag.Physical | StatModifierFlag.Bleed }], },
    { desc: '#% More Burn Damage', tags: ['Damage', 'Burn', 'Elemental', 'Ailment'], stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlag.Elemental | StatModifierFlag.Burn }], },
    { desc: '#% More Damage', tags: ['Damage'], stats: [{ name: 'Damage', valueType: 'More' }] },
    { desc: 'Adds # To # Physical Damage', tags: ['Damage', 'Physical'], stats: [{ name: 'MinDamage', valueType: 'Base', flags: StatModifierFlag.Physical }, { name: 'MaxDamage', valueType: 'Base', flags: StatModifierFlag.Physical }] },
    { desc: 'Adds # To # Elemental Damage', tags: ['Damage', 'Elemental'], stats: [{ name: 'MinDamage', valueType: 'Base', flags: StatModifierFlag.Elemental }, { name: 'MaxDamage', valueType: 'Base', flags: StatModifierFlag.Elemental }] },
    { desc: '#% Increased Bleed Damage', tags: ['Damage', 'Bleed', 'Physical', 'Ailment'], stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlag.Physical | StatModifierFlag.Bleed }], },
    { desc: '#% Increased Burn Damage', tags: ['Damage', 'Burn', 'Elemental', 'Ailment'], stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlag.Elemental | StatModifierFlag.Burn }], },
    { desc: '#% Increased Attack Speed', tags: ['Attack', 'Speed'], stats: [{ name: 'AttackSpeed', valueType: 'Inc' }] },
    { desc: '#% Increased Maximum Mana', tags: ['Mana'], stats: [{ name: 'MaxMana', valueType: 'Inc' }] },
    { desc: '+# Maximum Mana', tags: ['Mana'], stats: [{ name: 'MaxMana', valueType: 'Base' }] },
    { desc: '+# Mana Regeneration', tags: ['Mana'], stats: [{ name: 'ManaRegen', valueType: 'Base' }] },
    { desc: '+# Gold Generation', tags: ['Gold', 'Global'], stats: [{ name: 'GoldGeneration', valueType: 'Base', keywords: KeywordModifierFlag.Global }] },
    { desc: '#% Increased Gold Generation', tags: ['Gold', 'Global'], stats: [{ name: 'GoldGeneration', valueType: 'Inc', keywords: KeywordModifierFlag.Global }], },
    { desc: '#% Increased Skill Duration', tags: ['Skill'], stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlag.Skill }], },
    { desc: '+#% Chance To Bleed', tags: ['Attack', 'Bleed', 'Physical', 'Ailment'], stats: [{ name: 'BleedChance', valueType: 'Base', flags: StatModifierFlag.Bleed }], },
    { desc: '+#% Chance To Burn', tags: ['Attack', 'Burn', 'Elemental', 'Ailment'], stats: [{ name: 'BurnChance', valueType: 'Base', flags: StatModifierFlag.Burn }], },
    { desc: '# Bleed Duration', tags: ['Duration', 'Bleed', 'Ailment', "Global"], stats: [{ name: 'Duration', valueType: 'Base', flags: StatModifierFlag.Bleed, keywords: KeywordModifierFlag.Global }], },
    { desc: '# Burn Duration', tags: ['Duration', 'Burn', 'Ailment'], stats: [{ name: 'Duration', valueType: 'Base', flags: StatModifierFlag.Burn }], },
    { desc: '#% Increased Bleed Duration', tags: ['Duration', 'Bleed', 'Ailment', 'Global'], stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlag.Bleed, keywords: KeywordModifierFlag.Global }], },
    { desc: '#% Increased Burn Duration', tags: ['Duration', 'Burn', 'Ailment', 'Global'], stats: [{ name: 'Duration', valueType: 'Inc', flags: StatModifierFlag.Burn, keywords: KeywordModifierFlag.Global }], },
    { desc: '+# Maximum Bleed Stack', tags: ['Bleed', 'Ailment', 'Global'], stats: [{ name: 'AilmentStack', valueType: 'Base', flags: StatModifierFlag.Bleed, keywords: KeywordModifierFlag.Global }], },
    { desc: '+# Maximum Burn Stack', tags: ['Burn', 'Ailment', 'Global'], stats: [{ name: 'AilmentStack', valueType: 'Base', flags: StatModifierFlag.Burn, keywords: KeywordModifierFlag.Global }], },
    { desc: '+#% Critical Hit Chance', tags: ['Critical', 'Attack'], stats: [{ name: 'CritChance', valueType: 'Base' }] },
    { desc: '+#% Critical Hit Multiplier', tags: ['Critical', 'Attack'], stats: [{ name: 'CritMulti', valueType: 'Base' }] },
    { desc: '#% More Attack Speed', tags: ['Attack', 'Speed'], stats: [{ name: 'AttackSpeed', valueType: 'More' }] },
    { desc: '+#% Hit Chance', tags: ['Attack'], stats: [{ name: 'HitChance', valueType: 'Base' }] },
    { desc: '+# Maximum Minions', tags: ['Minion', 'Global'], stats: [{ name: 'MinionCount', valueType: 'Base', keywords: KeywordModifierFlag.Global }] },
    { desc: '#% Increased Minion Damage', tags: ['Minion', 'Damage'], stats: [{ name: 'Damage', valueType: 'Inc', flags: StatModifierFlag.Damage, keywords: KeywordModifierFlag.Minion }] },
    { desc: '#% More Minion Damage', tags: ['Minion', 'Damage'], stats: [{ name: 'Damage', valueType: 'More', flags: StatModifierFlag.Damage, keywords: KeywordModifierFlag.Minion }] },
];

export class Modifier {
    readonly text: string;
    readonly template: ModTemplate;
    readonly stats: StatModifier[] = [];
    constructor(text: string) {

        this.text = text;

        const parsedData = Modifier.parseText(text);
        this.template = parsedData.template;
        this.stats = parsedData.stats;
    }

    get tags() {
        return this.template.tags;
    }

    get templateDesc() {
        return this.template.desc;
    }

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
            stats.push(new StatModifier({
                name: statTemplate.name,
                valueType: statTemplate.valueType,
                value,
                min,
                max,
                flags: statTemplate.flags || 0,
                keywords: statTemplate.keywords
            }));
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
    readonly min: number;
    readonly max: number;
    source?: string;
    readonly flags: StatModifierFlag;
    readonly keywords: KeywordModifierFlag;
    constructor(private readonly data: StatModifierParams) {
        this.name = data.name;
        this.valueType = data.valueType;
        this.value = data.value;
        this.flags = data.flags || 0;
        this.min = data.min || this.value;
        this.max = data.max || this.value || this.min;
        this.source = data.source;
        this.keywords = data.keywords || 0;
    }

    randomizeValue() {
        this.value = Math.random() * (this.max - this.min) + this.min;
    }

    copy() {
        return new StatModifier(this.data);
    }
}

export class ModDB {
    private _modList: StatModifier[] = [];
    public readonly onChange = new EventEmitter();
    constructor() {
        this._modList = [];
    }

    get modList() {
        return this._modList;
    }

    add(source: string, ...statMods: StatModifier[]) {
        this.modList.push(...statMods.map(x => {
            const copy = x.copy();
            copy.source = source;
            Object.freeze(copy);
            return copy;
        }));
        this.onChange.invoke(undefined);
    }

    removeBySource(source: string) {
        this._modList = this.modList.filter(x => x.source !== source);
        this.onChange.invoke(undefined);
    }

    clear() {
        this._modList = [];
        this.onChange.invoke(undefined);
    }
}
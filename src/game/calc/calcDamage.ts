import { KeywordModifierFlag, StatModifierFlag, StatName } from "@game/mods";
import { CalcMinMax, calcModBase, calcModIncMore, calcModTotal, Configuration } from "./calcMod";
import { randomRange } from '@utils/helpers';
import type Entity from "../Entity";
import type { AilmentData, AilmentType } from "../Ailments";
import { MinionEntity } from "../Entity";

type ConversionValues = Partial<Record<keyof typeof DamageTypeFlags | 'multi', number>>;
export type ConversionTable = Partial<Record<keyof typeof DamageTypeFlags, ConversionValues>>;

export type DamageType = 'Physical' | 'Elemental' | 'Chaos';
type DamageFlag = number;
export const DamageTypeFlags: Record<DamageType, DamageFlag> = {
    Physical: 1 << 0,
    Elemental: 1 << 1,
    Chaos: 1 << 2,
} as const;


export interface AttackResult {
    hit: boolean;
    crit?: boolean;
    totalDamage?: number;
}

const damageNamesMetaTable = (() => {
    type StatName = 'Damage' | `${DamageType}Damage`;
    const names: StatName[][] = [];
    const length = Object.values(DamageTypeFlags).reduce((a, v) => a + v);
    for (let i = 0; i <= length; i++) {
        const flagList: StatName[] = ['Damage'];
        Object.entries(DamageTypeFlags).forEach(([key, value]) => {
            if (value & i) {
                const s = `${key}Damage` as StatName;
                flagList.push(s);
            }
        });
        names.push(flagList);
    }
    return names;
})();

export function calcAttack(source: Entity) {

    const config: Configuration = {
        statModList: [...source.modDB.modList],
        source,
        flags: StatModifierFlag.Attack,
        keywords: KeywordModifierFlag.Global
    };

    if(source instanceof MinionEntity){
        config.keywords |= KeywordModifierFlag.Minion;
    }

    //Hit
    const hitChance = calcModTotal('HitChance', config) / 100;
    const hitFac = randomRange(0, 1);
    const hit = hitChance >= hitFac;
    if (!hit) {
        return false;
    }

    const baseDamage = calcBaseAttackDamage(config, randomRange);

    const critChance = Math.min(calcModTotal('CritChance', config), 100) / 100;
    const critFac = randomRange(0, 1);
    const crit = critChance >= critFac;

    //Crit
    let critMultiplier = 1;
    if (crit) {
        critMultiplier = calcModTotal('CritMulti', config) / 100;
    }

    //finalize
    const finalMultiplier = critMultiplier;

    const totalDamage = baseDamage.totalBaseDamage * finalMultiplier;
    const totalPhysicalDamage = baseDamage.physicalDamage * finalMultiplier;
    const totalElementalDamage = baseDamage.elementalDamage * finalMultiplier;


    const ailments: AilmentData[] = [];
    //ailments
    {
        //bleed
        config.flags |= StatModifierFlag.Bleed | StatModifierFlag.Physical;
        const bleedChance = calcModTotal('BleedChance', config) / 100;
        if (bleedChance >= randomRange(0, 1)) {
            const damageFac = randomRange(0, 1);
            const duration = calcModTotal('Duration', config);
            ailments.push({ damageFac, type: 'Bleed', source, duration });
        }
        config.flags &= ~(StatModifierFlag.Bleed | StatModifierFlag.Physical);

        // config.flags &= ~(StatModifierFlag.Burn | StatModifierFlag.Elemental);
        // const burnChance = calcModTotal('BurnChance', config) / 100;
        // if (burnChance >= randomRange(0, 1)) {
        //     const damageFac = randomRange(0, 1);
        //     ailments.push({ damageFac, type: 'Burn', source: config.source });
        // }
    }

    return {
        hit,
        crit,
        totalDamage,
        totalPhysicalDamage,
        totalElementalDamage,
        ailments
    };
}

export function calcBaseAttackDamage(config: Configuration, calcMinMax: CalcMinMax) {

    const conversionTable = generateConversionTable(config);
    const output = {
        totalBaseDamage: 0,
        minPhysicalDamage: 0,
        maxPhysicalDamage: 0,
        physicalDamage: 0,
        minElementalDamage: 0,
        maxElementalDamage: 0,
        elementalDamage: 0,
        minChaosDamage: 0,
        maxChaosDamage: 0,
        chaosDamage: 0
    };

    let totalBaseDamage = 0;
    const baseDamageMultiplier = calcModBase('BaseDamageMultiplier', config) / 100;
    for (const damageType of Object.keys(DamageTypeFlags) as DamageType[]) {
        const bit = StatModifierFlag[damageType];
        config.flags |= bit;
        let { min, max } = calcDamage(damageType, config, conversionTable);
        min *= baseDamageMultiplier;
        max *= baseDamageMultiplier;
        output[`min${damageType}Damage`] = min;
        output[`max${damageType}Damage`] = max;
        const baseDamage = calcMinMax(min, max);
        output[`${damageType.toLowerCase()}Damage` as keyof typeof output] = baseDamage;
        totalBaseDamage += baseDamage;
        config.flags &= ~bit;
    }

    output.totalBaseDamage = totalBaseDamage;
    return output;
}

export function calcAilmentDamage(source: Entity, type: AilmentType) {
    const config: Configuration = {
        statModList: [...source.modDB.modList],
        source,
        flags: 0,
        keywords: KeywordModifierFlag.Global
    };
    if(source instanceof MinionEntity){
        config.keywords |= KeywordModifierFlag.Minion;
    }
    if (type === 'Bleed') {
        config.flags = StatModifierFlag.Bleed | StatModifierFlag.Physical;
        const { min, max } = calcAilmentBaseDamage('Physical', config);
        return { min, max };
    }
    throw Error();
}

export function calcAilmentDuration(source: Entity, type: AilmentType) {
    const config: Configuration = {
        statModList: [...source.modDB.modList],
        source,
        flags: 0,
        keywords: KeywordModifierFlag.Global
    };
    if (type === 'Bleed') {
        config.flags |= StatModifierFlag.Bleed;
        return calcModTotal('Duration', config);
    }
    return 0;
}


function calcDamage(damageType: DamageType, config: Configuration, conversionTable: ConversionTable, damageFlag = 0) {

    damageFlag |= DamageTypeFlags[damageType];
    let addMin = 0;
    let addMax = 0;
    const damageTypes = ['Physical', 'Elemental', 'Chaos'] as const;
    for (const type of damageTypes) {
        if (type === damageType) {
            break;
        }
        const convMulti = (conversionTable[type] as ConversionValues)[damageType] as number;
        if (convMulti > 0) {
            const { min, max } = calcDamage(type, config, conversionTable, damageFlag);
            addMin += Math.ceil(min * convMulti);
            addMax += Math.ceil(max * convMulti);
        }
    }

    const baseMin = calcModBase(`MinDamage` as StatName, config);
    const baseMax = calcModBase(`MaxDamage` as StatName, config);

    const modNames = damageNamesMetaTable[damageFlag];
    const min = Math.round(calcModIncMore(modNames as StatName[], baseMin, config) + addMin);
    const max = Math.round(calcModIncMore(modNames as StatName[], baseMax, config) + addMax);
    return { min, max };
}

export function calcAilmentBaseDamage(damageType: DamageType, config: Configuration, typeFlags = 0) {
    const conversionTable = generateConversionTable(config);
    let { min, max } = calcDamage(damageType, config, conversionTable, typeFlags);
    const convMulti = conversionTable[damageType]?.multi || 1;
    const baseDamageMultiplier = calcModTotal('BaseDamageMultiplier', config) / 100;
    min *= baseDamageMultiplier;
    max *= baseDamageMultiplier;
    return { min: min * convMulti, max: max * convMulti };
}


function generateConversionTable(config: Configuration) {

    type Conversion = Partial<Record<keyof typeof DamageTypeFlags, number>>;
    const conversionTable: ConversionTable = {};
    const damageTypeFlagKeys = Object.keys(DamageTypeFlags) as (keyof typeof DamageTypeFlags)[];
    for (let i = 0; i < damageTypeFlagKeys.length; i++) {
        const damageType = damageTypeFlagKeys[i];
        const globalConv: Conversion = {};
        const skillConv: Conversion = {};
        const add: Conversion = {};
        let globalTotal = 0;
        let skillTotal = 0;
        for (let j = i + 1; j < damageTypeFlagKeys.length; j++) {
            const otherDamageType = damageTypeFlagKeys[i];
            const convertedToName = `${damageType}ConvertedTo${otherDamageType}` as StatName;
            globalConv[otherDamageType!] = calcModBase(convertedToName, config);
            globalTotal += globalConv[otherDamageType!] as number;
            skillConv[otherDamageType!] = calcModBase(convertedToName, config);
            skillTotal += skillConv[otherDamageType!] as number;
            add[otherDamageType!] = calcModBase(`${damageType}GainAs${otherDamageType}` as StatName, config);
        }

        const fac = skillTotal > 100 ? 100 / skillTotal : (100 - skillTotal) / globalTotal;
        for (const key of Object.keys(skillConv)) {
            skillConv[key as DamageType]! *= fac;
        }

        const conversionValues: ConversionValues = { multi: 1 };
        for (const [key, value] of Object.entries(globalConv)) {
            const skillConvValue = skillConv[key as DamageType] || 0;
            const addValue = add[key as DamageType] || 0;
            conversionValues[key as DamageType] = (value + skillConvValue + addValue) / 100;
        }
        conversionValues.multi = 1 - Math.min((globalTotal + skillTotal) / 100, 1);
        conversionTable[damageType!] = conversionValues;
    }
    conversionTable.Chaos = { multi: 1 };
    return conversionTable;
}
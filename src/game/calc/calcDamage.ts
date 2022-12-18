import { StatModifier, StatModifierFlags, StatName } from "@game/mods";
import { calcModBase, calcModIncMore, calcModTotal, Configuration } from "./calcMod";
import { randomRange } from '@utils/helpers';

type ConversionValues = Partial<Record<keyof typeof DamageTypeFlags | 'multi', number>>;
export type ConversionTable = Partial<Record<keyof typeof DamageTypeFlags, ConversionValues>>;

type DamageType = 'Physical' | 'Elemental' | 'Chaos';
type DamageFlag = number;
const DamageTypeFlags: Record<DamageType, DamageFlag> = {
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

export function calcAttack(statModList: StatModifier[]) {

    const config: Configuration = {
        statModList,
        flags: StatModifierFlags.Attack,
        calcMinMax: randomRange
    };

    //Hit
    const hitChance = calcModTotal('HitChance', config) / 100;
    const hitFac = randomRange(0, 1);
    const hit = hitChance >= hitFac;
    if (!hit) {
        return { hit: false };
    }

    config.flags = StatModifierFlags.Attack;
    const baseDamage = calcBaseDamage(config);


    const critChance = Math.min(calcModTotal('CritChance', config), 100) / 100;
    const critFac = randomRange(0, 1);
    const crit = critChance >= critFac;

    //Crit
    let critMultiplier = 1;
    if (crit) {
        critMultiplier = calcModTotal('CritMulti', config) / 100;
    }

    const baseDamageMultiplier = calcModBase('BaseDamageMultiplier', config);
    //finalize
    const finalMultiplier = (baseDamageMultiplier / 100) * critMultiplier;

    const totalDamage = baseDamage.totalBaseDamage * finalMultiplier;
    const totalPhysicalDamage = baseDamage.physicalDamage * finalMultiplier;
    return {
        hit,
        crit,
        totalDamage,
        totalPhysicalDamage
    }
}

export function calcBaseDamage(config: Configuration) {

    config.conversionTable = generateConversionTable(config);
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

    {
        config.flags |= StatModifierFlags.Physical;
        const { min, max } = calcDamage('Physical', config);
        output.minPhysicalDamage = min;
        output.maxPhysicalDamage = max;
        const baseDamage = config.calcMinMax(min, max);
        output.physicalDamage = baseDamage;
        totalBaseDamage += baseDamage;
    }

    output.totalBaseDamage = totalBaseDamage;
    return output;
}


function calcDamage(damageType: DamageType, config: Configuration, damageFlag = 0) {

    damageFlag |= DamageTypeFlags[damageType];
    let addMin = 0;
    let addMax = 0;
    const damageTypes = ['Physical', 'Elemental', 'Chaos'] as const;
    for (const type of damageTypes) {
        if (type === damageType) {
            break;
        }
        const convMulti = (config.conversionTable?.[type] as ConversionValues)[damageType] as number;
        if (convMulti > 0) {
            const { min, max } = calcDamage(type, config, damageFlag);
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


function generateConversionTable(config: Configuration) {

    type Conversion = Partial<Record<keyof typeof DamageTypeFlags, number>>;
    const conversionTable: ConversionTable = {}
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
            globalConv[otherDamageType] = calcModBase(convertedToName, config);
            globalTotal += globalConv[otherDamageType] as number;
            skillConv[otherDamageType] = calcModBase(convertedToName, config);
            skillTotal += skillConv[otherDamageType] as number;
            add[otherDamageType] = calcModBase(`${damageType}GainAs${otherDamageType}` as StatName, config);
        }

        if (skillTotal > 100) {
            const fac = 100 / skillTotal;
            for (const key of Object.keys(skillConv)) {
                skillConv[key as DamageType] *= fac;
            }

        } else if (globalTotal + skillTotal > 100) {
            const fac = (100 - skillTotal) / globalTotal;
            for (const key of Object.keys(globalConv)) {
                globalConv[key as DamageType] *= fac;
            }
        }

        const conversionValues: ConversionValues = { multi: 1 };
        for (const [key, value] of Object.entries(globalConv)) {
            const skillConvValue = skillConv[key as DamageType] || 0;
            const addValue = add[key as DamageType] || 0;
            conversionValues[key as DamageType] = (value + skillConvValue + addValue) / 100;
        }
        conversionValues.multi = 1 - Math.min((globalTotal + skillTotal) / 100, 1)
        conversionTable[damageType] = conversionValues;
    }
    conversionTable['Chaos'] = { multi: 1 };
    return conversionTable;
}
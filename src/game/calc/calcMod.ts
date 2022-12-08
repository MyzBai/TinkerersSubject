import { avg, clamp } from "@utils/helpers";
import { StatModifier, StatModifierFlags, StatName, StatModifierValueType } from "../mods";
import { calcBaseDamage, ConversionTable } from "./calcDamage";



export interface Configuration {
    statModList: StatModifier[];
    flags?: number;
    calcMinMax?: (min: number, max: number) => number;
    conversionTable?: ConversionTable;
}


export function calcPlayerStats(statModList: StatModifier[]) {

    const config: Configuration = {
        statModList,
        flags: StatModifierFlags.Attack,
        calcMinMax: avg
    };

    //Hit Chance
    const hitChance = calcModTotal('HitChance', config) / 100;
    const clampedHitChance = clamp(hitChance, 0, 1);

    //Attack Speed
    const attackSpeed = calcModTotal('AttackSpeed', config);
    //Base Damage Multiplier
    const baseDamageMultiplier = calcModBase('BaseDamageMultiplier', config) / 100;

    //Mana
    const maxMana = calcModTotal('MaxMana', config);
    const manaRegen = calcModTotal('ManaRegen', config);
    const attackManaCost = calcModTotal('AttackManaCost', config);
    //Crit
    const critChance = calcModTotal('CritChance', config) / 100;
    const clampedCritChance = clamp(critChance, 0, 1);
    const critMulti = Math.max(calcModTotal('CritMulti', config), 100) / 100;
    // const critDamageMultiplier = 1 + (clampedCritChance * (critMulti - 1));
    const critDamageMultiplier = 1 + (clampedCritChance * critMulti);

    const baseDamageResult = calcBaseDamage(config);

    const multiplier = baseDamageMultiplier * critDamageMultiplier;
    const dps = baseDamageResult.totalBaseDamage * clampedHitChance * attackSpeed * multiplier;

    return {
        hitChance: hitChance * 100,
        clampedHitChance: clampedHitChance * 100,
        attackSpeed,
        critChance: critChance * 100,
        clampedCritChance: clampedCritChance * 100,
        critMulti: critMulti * 100,
        maxMana,
        manaRegen,
        attackManaCost,
        dps,
        minPhysicalDamage: baseDamageResult.minPhysicalDamage,
        maxPhysicalDamage: baseDamageResult.maxPhysicalDamage,

        goldPerSecond: calcModTotal('GoldPerSecond', config)
    }
}


//#region calcMod
export function calcModBase(modName: StatName | StatName[], config: Configuration) {
    return calcModSum('Base', modName, config);
}
export function calcModInc(modName: StatName | StatName[], config: Configuration) {
    return Math.max(0, 1 + calcModSum("Inc", modName, config) / 100);
}
export function calcModMore(modName: StatName | StatName[], config: Configuration) {
    return Math.max(0, calcModSum("More", modName, config));
}
export function calcModIncMore(modName: StatName | StatName[], base: number, config: Configuration) {
    if (base <= 0) return 0;
    const inc = calcModInc(modName, config);
    const more = calcModMore(modName, config);
    return base * inc * more;
}
export function calcModTotal(modName: StatName | StatName[], config: Configuration) {
    const base = calcModBase(modName, config);
    if (base === 0) {
        return 0;
    }
    const inc = calcModInc(modName, config);
    const more = calcModMore(modName, config);
    return base * inc * more;
}
export function calcModSum(valueType: StatModifierValueType, name: StatName | StatName[], config: Configuration) {

    name = Array.isArray(name) ? name : [name]; // force array
    let result = valueType === 'More' ? 1 : 0;
    const hasFlag = (a: number, b: number) => {
        return (a & b) === b;
    }

    const filteredModList = config.statModList.filter(x => {
        if(!name.includes(x.name)){
            return false;
        }
        if (x.valueType !== valueType)
            return false;
        if (!hasFlag(config.flags, x.flags || 0))
            return false;
        return true;
    });
    for (const mod of filteredModList) {
        let value = mod.value;
        if (valueType === 'More') {
            result *= 1 + value / 100;
        } else {
            result += value;
        }
    }
    return Math.max(0, result);
}
//#endregion calcMod
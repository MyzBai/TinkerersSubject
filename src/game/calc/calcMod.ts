import { avg, clamp } from "@utils/helpers";
import type { MinionEntity, PlayerEntity } from "../Entity";
import type Entity from "../Entity";
import { StatModifier, StatModifierFlag, StatName, StatModifierValueType, KeywordModifierFlag } from "../mods";
import Player from "../Player";
import Statistics from "../Statistics";
import { calcAilmentBaseDamage, calcBaseAttackDamage, ConversionTable } from "./calcDamage";

export type CalcMinMax = (min: number, max: number) => number;

export interface Configuration {
    statModList: StatModifier[];
    flags: number;
    conversionTable?: ConversionTable;
    source?: Entity;
    keywords: KeywordModifierFlag;
}

export function calculateEntityStats(entity: Entity, keyword?: KeywordModifierFlag) {
    const statistics = entity.stats;

    const config: Configuration = {
        statModList: entity.modDB.modList,
        flags: StatModifierFlag.Attack,
        keywords: KeywordModifierFlag.Global | (keyword || 0),
        source: entity
    };


    //Hit Chance
    const hitChance = calcModTotal('HitChance', config) / 100;
    statistics['Hit Chance'].set(hitChance);
    const clampedHitChance = clamp(hitChance, 0, 1);

    //Attack Speed
    const attackSpeed = calcModTotal('AttackSpeed', config);
    statistics['Attack Speed'].set(attackSpeed);

    //Crit
    const critChance = calcModTotal('CritChance', config) / 100;
    statistics['Critical Hit Chance'].set(critChance);
    const clampedCritChance = clamp(critChance, 0, 1);
    const critMulti = Math.max(calcModTotal('CritMulti', config), 100) / 100;
    statistics['Critical Hit Multiplier'].set(critMulti);

    let attackDps = 0;
    {
        config.flags = StatModifierFlag.Attack;
        const baseDamageResult = calcBaseAttackDamage(config, avg);
        const critDamageMultiplier = 1 + (clampedCritChance * critMulti);
        attackDps = baseDamageResult.totalBaseDamage * clampedHitChance * attackSpeed * critDamageMultiplier;

        statistics['Attack Dps'].set(attackDps);
        statistics['Attack Damage'].set(baseDamageResult.totalBaseDamage);
        statistics['Physical Attack Damage'].set(baseDamageResult.physicalDamage);
        statistics['Elemental Attack Damage'].set(baseDamageResult.elementalDamage);
    }

    //bleed
    let bleedDps = 0, bleedChance = 0, maxBleedStacks = 0, bleedDuration = 0;
    {
        config.flags = StatModifierFlag.Physical | StatModifierFlag.Bleed;
        bleedChance = calcModTotal('BleedChance', config) / 100;
        maxBleedStacks = calcModTotal('AilmentStack', config);
        bleedDuration = calcModTotal('Duration', config);
        if (bleedChance > 0) {
            const { min, max } = calcAilmentBaseDamage('Physical', config);
            const baseDamage = avg(min, max);
            const stacksPerSecond = clampedHitChance * bleedChance * attackSpeed;
            const maxStacks = Math.min(stacksPerSecond * bleedDuration, maxBleedStacks);
            bleedDps = baseDamage * maxStacks;
        }
        statistics['Bleed Dps'].set(bleedDps);
        statistics['Bleed Chance'].set(bleedChance);
        statistics['Maximum Bleed Stacks'].set(maxBleedStacks);
        statistics['Bleed Duration'].set(bleedDuration);
    }

    //burn
    let burnDps = 0, burnChance = 0, maxBurnStacks = 0, burnDuration = 0;
    {
        config.flags = StatModifierFlag.Elemental | StatModifierFlag.Burn;
        burnChance = calcModTotal('BurnChance', config) / 100;
        maxBurnStacks = calcModTotal('AilmentStack', config);
        burnDuration = calcModTotal('Duration', config);
        if (burnChance > 0) {
            const { min, max } = calcAilmentBaseDamage('Elemental', config);
            const baseDamage = avg(min, max);
            const stacksPerSecond = clampedHitChance * burnChance * attackSpeed;
            const maxStacks = Math.min(stacksPerSecond * burnDuration, maxBurnStacks);
            burnDps = baseDamage * maxStacks;
        }
        statistics['Burn Dps'].set(burnDps);
        statistics['Burn Chance'].set(burnChance);
        statistics['Maximum Burn Stacks'].set(maxBurnStacks);
        statistics['Burn Duration'].set(burnDuration);
    }

    const ailmentDps = bleedDps + burnDps;

    const dps = (attackDps + ailmentDps);
    statistics.Dps.set(dps);
}

export function calcPlayerStats(player: PlayerEntity) {
    const statistics = player.stats;

    const config = {
        statModList: Player.modDB.modList,
        flags: 0,
        source: player,
        keywords: KeywordModifierFlag.Global
    } satisfies Configuration;

    //Mana
    const maxMana = calcModTotal('MaxMana', config);
    statistics['Maximum Mana'].set(maxMana);
    const manaRegen = calcModTotal('ManaRegen', config);
    statistics['Mana Regeneration'].set(manaRegen);
    const attackManaCost = calcModTotal('AttackManaCost', config);
    statistics['Attack Mana Cost'].set(attackManaCost);

    calculateEntityStats(player);

    const skillDurationMultiplier = calcModIncMore('Duration', 1, Object.assign({}, config, { flags: StatModifierFlag.Skill }));
    statistics['Skill Duration Multiplier'].set(skillDurationMultiplier);

    const goldGeneration = calcModTotal('GoldGeneration', config);
    Statistics.gameStats['Gold Generation'].set(goldGeneration);
}

export function calcMinionStats(minion: MinionEntity) {

    calculateEntityStats(minion, KeywordModifierFlag.Minion);
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
    };

    const filteredModList = config.statModList.filter(x => {
        if (!name.includes(x.name)) {
            return false;
        }
        if (x.valueType !== valueType)
            return false;
        if (!hasFlag(config.keywords, x.keywords)) {
            return false;
        }
        if (!hasFlag(config.flags, x.flags || 0))
            return false;
        return true;
    });
    for (const mod of filteredModList) {
        const value = mod.value;
        if (valueType === 'More') {
            result *= 1 + value / 100;
        } else {
            result += value;
        }
    }
    return Math.max(0, result);
}
//#endregion calcMod
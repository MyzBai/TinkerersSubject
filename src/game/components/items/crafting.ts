import { ModifierTag } from "../../mods";
import { ItemModifier, ModTables } from "./items";

export type CraftId = keyof typeof templates;
export interface CraftData {
    itemModList: ItemModifier[];
    modTables: ModTables
}

const MAX_ITEM_MODS = 6;
const REFORGE_HIGHER_CHANCE_SAME_MODS = 20;
const REFORGE_LOWER_CHANCE_SAME_MODS = 0.02;

export const templates = {
    reforge: {
        desc: 'Reforge the item with new random modifiers',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general),
        getItemMods: (data: CraftData) => new Crafter().addMultiple(data.modTables.general, generateReforgeModCount(0)).modList
    },
    reforgeIncludePhysical: {
        desc: 'Reforge the item with new random modifiers, including a [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).modsContainsTag(data.modTables.general, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modTables.general, 'Physical').addMultiple(data.modTables.general, generateReforgeModCount(1)).modList
    },
    reforgeIncludeMana: {
        desc: 'Reforge the item with new random modifiers, including a [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).modsContainsTag(data.modTables.general, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modTables.general, 'Mana').addMultiple(data.modTables.general, generateReforgeModCount(1)).modList
    },
    reforgeIncludeCritical: {
        desc: 'Reforge the item with new random modifiers, including a [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).modsContainsTag(data.modTables.general, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modTables.general, 'Critical').addMultiple(data.modTables.general, generateReforgeModCount(1)).modList
    },
    reforgeHigherChanceSameMods:{
        desc: 'Reforge the item with a higher chance of receiving the same modifiers',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modTables.general),
        getItemMods: (data: CraftData) => {
            const mods = [...data.modTables.general].reduce((a, c) => {
                if (data.itemModList.some(x => x === c)) {
                    c.weight *= REFORGE_HIGHER_CHANCE_SAME_MODS;
                }
                a.push(c);
                return a;
            }, [] as ItemModifier[]);
            return new Crafter().addMultiple(mods, generateReforgeModCount(0)).modList;
        }
    },
    reforgeLowerChanceSameMods: {
        desc: 'Reforge the item with a lower chance of receiving the same modifiers',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modTables.general),
        getItemMods: (data: CraftData) => {
            const mods = [...data.modTables.general].reduce((a, c) => {
                if (data.itemModList.some(x => x === c)) {
                    c.weight *= REFORGE_LOWER_CHANCE_SAME_MODS;
                }
                a.push(c);
                return a;
            }, [] as ItemModifier[]);
            return new Crafter().addMultiple(mods, generateReforgeModCount(0)).modList;
        }
    },
    addRandom: {
        desc: 'Add a random modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasSpaceForMods(data.itemModList).modsIsNotEmpty(data.modTables.general),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOne(data.modTables.general).modList
    },
    addPhysical: {
        desc: 'Add a [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modTables.general, 'Physical').modList
    },
    addMana: {
        desc: 'Add a [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modTables.general, 'Mana').modList
    },
    addCritical: {
        desc: 'Add a [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modTables.general).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modTables.general, 'Critical').modList
    },
    removeRandom: {
        desc: 'Remove a random modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().modList
    },
    removeRandomAddRandom: {
        desc: 'Remove a random modifier and add a new random modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modTables.general),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOne(data.modTables.general).modList
    },
    removeRandomAddPhysical: {
        desc: 'Remove a random modifier and add a new [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modTables.general, 'Physical').itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modTables.general, 'Physical').modList
    },
    removeRandomAddMana: {
        desc: 'Remove a random modifier and add a new [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modTables.general, 'Mana').itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modTables.general, 'Mana').modList
    },
    removeRandomAddCritical: {
        desc: 'Remove a random modifier and add a new [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modTables.general, 'Critical').itemCanCraftModWithTag(data.itemModList, data.modTables.general, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modTables.general, 'Critical').modList
    }
}


class CraftValidator {
    errors: string[] = [];
    constructor() {
        this.errors = [];
    }

    itemHasSpaceForMods(itemModList: ItemModifier[]) {
        if (itemModList.length >= MAX_ITEM_MODS) {
            this.errors.push('Item cannot have any more modifiers');
        }
        return this;
    }

    itemHasModifiers(itemModList: ItemModifier[]) {
        if (itemModList.length === 0) {
            this.errors.push('Item has no modifiers');
        }
        return this;
    }

    itemCanCraftModWithTag(itemModList: ItemModifier[], itemMods: ItemModifier[], tag: ModifierTag) {
        const filteredMods = itemMods.filter(x => x.tags?.includes(tag) && !itemModList.some(y => y === x));
        if (filteredMods.length === 0) {
            this.errors.push(`There are no ${tag} modifiers available`);
        }
        return this;
    }

    modsIsNotEmpty(itemModList: ItemModifier[]) {
        if (itemModList.length === 0) {
            this.errors.push('No modifiers available');
        }
        return this;
    }

    modsContainsTag(itemModList: ItemModifier[], tag: ModifierTag) {
        if (!itemModList.some(x => x.tags?.includes(tag))) {
            this.errors.push(`No modifier was available with the tag: ${tag}`);
        }
        return this;
    }
}

class Crafter {
    modList: ItemModifier[];
    constructor(itemMods: ItemModifier[] = []) {
        this.modList = [...itemMods];
    }

    addOne(itemModList: ItemModifier[]) {
        this.modList.push(...this.#generateMods(itemModList, this.modList, 1))
        return this;
    }
    addOneByTag(itemModList: ItemModifier[], tag: ModifierTag) {
        itemModList = itemModList.filter(x => x.tags?.includes(tag));
        this.modList.push(...this.#generateMods(itemModList, this.modList, 1));
        return this;
    }

    addMultiple(itemModList: ItemModifier[], count: number) {
        this.modList.push(...this.#generateMods(itemModList, this.modList, count));
        return this;
    }

    removeRandom() {
        const randomIndex = this.#randomRangeInt(0, this.modList.length);
        this.modList.splice(randomIndex, 1);
        return this;
    }

    #generateMods(itemModList: ItemModifier[], filterMods: ItemModifier[] = [], count: number) {
        const newItemMods: ItemModifier[] = [];
        for (let i = 0; i < count; i++) {
            const tempArr = [...newItemMods, ...filterMods];
            itemModList = itemModList.filter(x => !tempArr.some(y => x.templateDesc === y.templateDesc));
            let weightSum = itemModList.reduce((a, c) => a += c.weight, 0);
            const random = Math.random() * weightSum;
            for (const mod of itemModList) {
                weightSum -= mod.weight;
                if (weightSum <= random) {
                    newItemMods.push(mod);
                    break;
                }
            }
        }
        return newItemMods;
    }

    /**@param {number} min @param {number} max */
    #randomRangeInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
}

const generateReforgeModCount = (offset = 0) => {
    const REFORGE_WEIGHTS = [0, 0, 40, 50, 30, 20].slice(offset, 6);
    let sum = REFORGE_WEIGHTS.reduce((a, c) => a + c);
    const random = Math.random() * sum;
    for (let i = 0; i < REFORGE_WEIGHTS.length; i++) {
        sum -= REFORGE_WEIGHTS[i];
        if (sum <= random) {
            return i + 1;
        }
    }
    throw Error();
}
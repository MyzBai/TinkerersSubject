import type { ModifierTag } from "../../mods";
import type { ItemModifier } from "./Items";

export type CraftId = keyof typeof craftTemplates;
export interface CraftData {
    itemModList: ItemModifier[];
    modList: ItemModifier[];
}

const MAX_ITEM_MODS = 6;
const REFORGE_HIGHER_CHANCE_SAME_MODS = 20;
const REFORGE_LOWER_CHANCE_SAME_MODS = 0.02;

export const craftTemplates = {
    reforge: {
        desc: 'Reforge the item with new random modifiers',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList),
        getItemMods: (data: CraftData) => new Crafter().addMultiple(data.modList, generateReforgeModCount(0)).modList
    },
    reforgeIncludePhysical: {
        desc: 'Reforge the item with new random modifiers, including a [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).modsContainsTag(data.modList, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modList, 'Physical').addMultiple(data.modList, generateReforgeModCount(1)).modList
    },
    reforgeIncludeElemental: {
        desc: 'Reforge the item with new random modifiers, including a [elemental] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).modsContainsTag(data.modList, 'Elemental'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modList, 'Elemental').addMultiple(data.modList, generateReforgeModCount(1)).modList
    },
    reforgeIncludeMana: {
        desc: 'Reforge the item with new random modifiers, including a [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).modsContainsTag(data.modList, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modList, 'Mana').addMultiple(data.modList, generateReforgeModCount(1)).modList
    },
    reforgeIncludeCritical: {
        desc: 'Reforge the item with new random modifiers, including a [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).modsContainsTag(data.modList, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter().addOneByTag(data.modList, 'Critical').addMultiple(data.modList, generateReforgeModCount(1)).modList
    },
    reforgeHigherChanceSameMods:{
        desc: 'Reforge the item with a higher chance of receiving the same modifiers',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modList),
        getItemMods: (data: CraftData) => {
            const mods = [...data.modList].map(x => x.copy()).reduce((a, c) => {
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
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modList),
        getItemMods: (data: CraftData) => {
            const mods = [...data.modList].map(x => x.copy()).reduce((a, c) => {
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
        validate: (data: CraftData) => new CraftValidator().itemHasSpaceForMods(data.itemModList).modsIsNotEmpty(data.modList),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOne(data.modList).modList
    },
    addPhysical: {
        desc: 'Add a [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modList, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modList, 'Physical').modList
    },
    addElemental: {
        desc: 'Add a [elemental] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modList, 'Elemental'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modList, 'Elemental').modList
    },
    addMana: {
        desc: 'Add a [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modList, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modList, 'Mana').modList
    },
    addCritical: {
        desc: 'Add a [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().modsIsNotEmpty(data.modList).itemHasSpaceForMods(data.itemModList).itemCanCraftModWithTag(data.itemModList, data.modList, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).addOneByTag(data.modList, 'Critical').modList
    },
    removeRandom: {
        desc: 'Remove a random modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().modList
    },
    removeRandomAddRandom: {
        desc: 'Remove a random modifier and add a new random modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsIsNotEmpty(data.modList),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOne(data.modList).modList
    },
    removeRandomAddPhysical: {
        desc: 'Remove a random modifier and add a new [physical] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modList, 'Physical').itemCanCraftModWithTag(data.itemModList, data.modList, 'Physical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modList, 'Physical').modList
    },
    removeRandomAddElemental: {
        desc: 'Remove a random modifier and add a new [elemental] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modList, 'Elemental').itemCanCraftModWithTag(data.itemModList, data.modList, 'Elemental'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modList, 'Elemental').modList
    },
    removeRandomAddMana: {
        desc: 'Remove a random modifier and add a new [mana] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modList, 'Mana').itemCanCraftModWithTag(data.itemModList, data.modList, 'Mana'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modList, 'Mana').modList
    },
    removeRandomAddCritical: {
        desc: 'Remove a random modifier and add a new [critical] modifier',
        validate: (data: CraftData) => new CraftValidator().itemHasModifiers(data.itemModList).modsContainsTag(data.modList, 'Critical').itemCanCraftModWithTag(data.itemModList, data.modList, 'Critical'),
        getItemMods: (data: CraftData) => new Crafter(data.itemModList).removeRandom().addOneByTag(data.modList, 'Critical').modList
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
        const filteredMods = itemMods.filter(x => x.template.tags.includes(tag) && !itemModList.some(y => y.compare(x)));
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
        if (!itemModList.some(x => x.tags.includes(tag))) {
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
        this.modList.push(...this.generateMods(itemModList, this.modList, 1))
        return this;
    }
    addOneByTag(itemModList: ItemModifier[], tag: ModifierTag) {
        itemModList = itemModList.filter(x => x.tags.includes(tag));
        this.modList.push(...this.generateMods(itemModList, this.modList, 1));
        return this;
    }

    addMultiple(itemModList: ItemModifier[], count: number) {
        this.modList.push(...this.generateMods(itemModList, this.modList, count));
        return this;
    }

    removeRandom() {
        const randomIndex = this.randomRangeInt(0, this.modList.length);
        this.modList.splice(randomIndex, 1);
        return this;
    }

    private generateMods(itemModList: ItemModifier[], filterMods: ItemModifier[] = [], count: number) {
        const newItemMods: ItemModifier[] = [];
        for (let i = 0; i < count; i++) {
            const tempArr = [...newItemMods, ...filterMods];
            itemModList = itemModList.filter(x => !tempArr.some(y => x.templateDesc === y.templateDesc));
            let weightSum = itemModList.reduce((a, c) => a += c.weight, 0);
            const random = Math.random() * weightSum;
            for (const mod of itemModList) {
                weightSum -= mod.weight;
                if (weightSum <= random) {
                    const copy = mod.copy();
                    copy.stats.forEach(x => x.randomizeValue());
                    newItemMods.push(copy);
                    break;
                }
            }
        }
        return newItemMods;
    }

    private randomRangeInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min) + min);
    }
}

const generateReforgeModCount = (offset = 0) => {
    const REFORGE_WEIGHTS = [0, 0, 40, 50, 30, 20].slice(offset, 6);
    let sum = REFORGE_WEIGHTS.reduce((a, c) => a + c);
    const random = Math.random() * sum;
    for (let i = 0; i < REFORGE_WEIGHTS.length; i++) {
        sum -= REFORGE_WEIGHTS[i]!;
        if (sum <= random) {
            return i + 1;
        }
    }
    throw Error();
}
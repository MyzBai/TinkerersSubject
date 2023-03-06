import type { CraftId } from "@src/game/components/items/crafting";


export default interface ItemsSave {
    items: Item[];
    craftPresets: CraftPreset[];
}

interface Item {
    name: string;
    modList: Mod[];
}

interface Mod {
    values: number[];
    text: string;
};

interface CraftPreset {
    name: string;
    ids: CraftId[];
}
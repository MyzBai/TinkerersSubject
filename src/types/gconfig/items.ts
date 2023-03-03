import type { CraftId } from "@src/game/components/items/crafting";

export default interface ItemsConfig {
    levelReq: number;
    itemList: ItemConfig[];
    modLists: ItemModConfig[][];
    craftList: CraftConfig[];
}

export interface ItemConfig {
    name: string;
    levelReq: number;
}

export interface ItemModConfig{
    levelReq: number;
    weight: number;
    mod: string;
}

export interface CraftConfig{
    id: CraftId;
    levelReq: number;
    cost: number;
}
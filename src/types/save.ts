import type { AilmentType } from "@src/game/Ailments";
import type { CraftId } from "@src/game/components/items/crafting";
import type Statistics from "@src/game/Statistics";
import type GConfiguration from "./gconfig/gameConfig";

export interface Save {
    meta: GConfiguration['meta'];
    player?: {
        level: number;
        gold: number;
        curMana: number;
    };
    enemy?: {
        index: number;
        health: number;
        dummyDamage: number;
        ailments?: {
            type: AilmentType;
            instances: {
                damageFac: number; time: number;
            }[];
        }[];
    };
    skills?: {
        attackSkillSlot: {
            name: string;
            rankIndex: number;
        };
        attackSkillList: {
            name: string;
            rankProgressList: number[];
        }[];
        buffSkillSlotList: {
            name: string;
            index: number;
            time: number;
            automate: boolean;
            rankIndex: number;
        }[];
        buffSkillList: {
            name: string;
            rankProgressList: number[];
        }[];
    };
    passives?: {
        list: { index: number; desc: string }[];
    };
    items?: {
        items: {
            name: string;
            modList: {
                values: number[];
                text: string;
            }[];
        }[];
        craftPresets: { name: string, ids: CraftId[] }[];
    };
    missions?: {
        missions: {
            desc: string;
            startValue: number;
        }[];
    };
    statistics?: { name: keyof Statistics['statistics'], value: number, sticky: boolean }[];
}

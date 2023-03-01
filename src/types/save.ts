import { AilmentType } from "@src/game/Ailments";
import { CraftId } from "@src/game/components/items/crafting";
import type Statistics from "@src/game/Statistics";
import type GConfig from "./gconfig";

export interface Save {
    meta: GConfig['meta'];
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
        attackSkillName: string;
        buffSkills: {
            name: string;
            index: number;
            active: boolean;
            time: number;
            automate: boolean;
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
            index: number;
            desc: string;
            startValue: number;
        }[];
    };
    statistics?: { name: string, value: number }[];
}

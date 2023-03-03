import type AchievementsConfig from "./achievements";
import type CompanionsConfig from "./companions";
import type GameConfig from "./gameConfig";
import type ItemsConfig from "./items";
import type MissionsConfig from "./missions";
import type PassivesConfig from "./passives";
import type SkillsConfig from "./skills";


export default interface ComponentsConfig {
    skills?: SkillsConfig;
    passives?: PassivesConfig;
    items?: ItemsConfig;
    missions?: MissionsConfig;
    achievements?: AchievementsConfig;
    companions?: CompanionsConfig;
}

export type ComponentName = { [K in keyof Required<Required<GameConfig>['components']>]: K }[keyof Required<GameConfig>['components']];
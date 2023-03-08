import type MetaConfig from "../gconfig/meta";
import type MinionsSave from "./minions";
import type EnemySave from "./enemy";
import type ItemsSave from "./itemsSave";
import type MissionsSave from "./missions";
import type PassivesSave from "./passives";
import type PlayerSave from "./player";
import type SkillsSave from "./skills";
import type StatisticsSave from "./statistics";



export default interface GameSave {
    meta: MetaConfig;
    player?: PlayerSave;
    enemy?: EnemySave;
    statistics?: StatisticsSave;

    //components
    skills?: SkillsSave;
    passives?: PassivesSave;
    items?: ItemsSave;
    missions?: MissionsSave;
    minions?: MinionsSave;
}


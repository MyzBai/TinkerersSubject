export default interface MissionsConfig {
    levelReq: number;
    slots: MissionSlotConfig[];
    missionLists: MissionConfig[][];
}

export interface MissionSlotConfig {
    levelReq: number;
    cost: number;
}
export interface MissionConfig {
    description: string;
    levelReq: number;
    goldAmount: number;
}
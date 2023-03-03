
export default interface PassivesConfig {
    pointsPerLevel: number;
    passiveLists: PassiveConfig[][];
}

export interface PassiveConfig{
    levelReq: number;
    points: number;
    mod: string;
}
export default interface AchievementsConfig {
    list: AchievementConfig[]
}

export interface AchievementConfig{
    description: string;
    modList?: string[];
}
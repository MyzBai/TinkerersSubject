
export default interface CompanionsSave{
    companionSlots: CompanionSlotSave[];
    companionList: CompanionRankSave[];
}

export interface CompanionSlotSave{
    name: string;
    rankIndex: number;
}

export interface CompanionRankSave{
    name: string;
}

export default interface MinionsSave{
    minionSlots: MinionSlotSave[];
    minionList: MinionRankSave[];
}

export interface MinionSlotSave{
    name: string;
    rankIndex: number;
}

export interface MinionRankSave{
    name: string;
}
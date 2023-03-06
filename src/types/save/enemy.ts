import type { AilmentType } from "@src/game/Ailments";

export default interface EnemySave {
    index?: number;
    health?: number;
    dummyDamage?: number;
    ailments: Ailment[];
}

interface Ailment {
    type: AilmentType;
    instances: AilmentInstance[];
}

interface AilmentInstance {
    damageFac?: number;
    time: number;
}
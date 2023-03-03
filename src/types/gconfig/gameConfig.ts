import type MetaConfig from "./meta";
import type OptionsConfig from "./options";
import type ComponentsConfig from "./components";

export default interface GameConfig {
    meta: MetaConfig;
    options?: OptionsConfig;
    player?: { modList: string[]; }
    enemies: { enemyList: number[]; }
    components?: ComponentsConfig;
}

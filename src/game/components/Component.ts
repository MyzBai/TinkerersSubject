import type { Save } from "@src/types/save";
import type Game from "../Game";

export default abstract class Component {
    constructor(readonly game: Game) {

    }
    abstract dispose(): void;
    abstract save(saveObj: Save): void;
}
import type Game from "./game";

export default abstract class Component {
    constructor(readonly game: Game) {

    }
    abstract dispose(): void;
}
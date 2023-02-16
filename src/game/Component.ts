import type Game from "./Game";

export default abstract class Component {
    constructor(readonly game: Game) {

    }
    abstract dispose(): void;
}
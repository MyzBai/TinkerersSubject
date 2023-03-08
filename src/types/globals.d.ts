

declare module '*.html' {
    const value: string;
    export default value;
}

interface Window {
    TS: TS;

}

interface TS {
    deleteAllSaves: () => void
    game: import("@src/game/Game").Game;
    statistics: import("@src/game/Statistics").Statistics;
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
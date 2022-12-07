import EventEmitter from "./EventEmitter";

type Callback = (dt: number) => void;
interface Instance {
    time: number;
    id: number;
    callback: Callback;
    options?: Options;
}

interface Options {
    intervalMilliseconds: number;

}


const TARGET_FRAME_TIME = 1000 / 25;

export default class Loop {
    #instances = new Map<number, Instance>;
    #running: boolean = false;
    #loopId: number;
    #counter = 0;
    constructor() {
    }

    get running() {
        return this.#running;
    }

    subscribe(callback: Callback, options?: Options) {
        const id = this.#counter++;
        const instance: Instance = { callback, time: 0, id, options };
        this.#instances.set(id, instance);
        return id;
    }

    unsubscribe(id: number) {
        this.#instances.delete(id);
    }

    reset() {
        this.#instances.clear();
        this.#running = false;
    }

    start() {
        if (this.running) {
            return;
        }
        this.#running = true;
        this.beginLoop();
    }

    stop() {
        this.#running = false;
        clearTimeout(this.#loopId);
    }

    private beginLoop() {
        let remainder = 0;
        let now = performance.now();
        const loop = () => {
            clearTimeout(this.#loopId);
            this.#loopId = setTimeout(() => {
                let diff = performance.now() - now + remainder;
                now = performance.now();
                while (diff > TARGET_FRAME_TIME) {
                    let dt = Math.min(diff, TARGET_FRAME_TIME);
                    diff -= TARGET_FRAME_TIME;
                    const deltaTimeSeconds = dt / 1000;
                    this.#instances.forEach(instance => {
                        instance.time += dt;
                        let ms = instance.options?.intervalMilliseconds || 0;
                        if (instance.time > ms) {
                            instance.callback(deltaTimeSeconds);
                            instance.time -= ms || instance.time;
                        }
                    });
                }
                loop();
            }, TARGET_FRAME_TIME);
        }
        loop();
    }
}
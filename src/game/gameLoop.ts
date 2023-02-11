
type Callback = (dt: number) => void;

interface Instance {
    time: number;
    id: number;
    callback: Callback;
    options?: Options;
}
interface AnimInstance {
    id: number;
    callback: Callback;
}
interface Options {
    intervalMilliseconds: number;
}

const TARGET_FRAME_TIME = 1000 / 25;
const DELTA_TIME_SECONDS = TARGET_FRAME_TIME / 1000;

class Loop {
    public running: boolean = false;
    
    private instances = new Map<number, Instance>();
    private animInstances = new Map<number, AnimInstance>();
    private loopId = 0;
    private animLoopId = 0;
    private counter = 0;
    private animCounter = 0;
    constructor() {

    }

    subscribe(callback: Callback, options?: Options) {
        const id = this.counter++;
        const instance: Instance = { callback, time: 0, id, options };
        this.instances.set(id, instance);
        return id;
    }

    subscribeAnim(callback: Callback) {
        const id = this.animCounter++;
        const instance: AnimInstance = { callback, id };
        this.animInstances.set(id, instance);
        return id;
    }

    unsubscribe(id: number) {
        this.instances.delete(id);
    }

    unsubscribeAnim(id: number){
        this.animInstances.delete(id);
    }

    reset() {
        this.instances.clear();
        this.running = false;
    }

    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.beginLoop();
        this.beginAnimationLoop();
    }

    stop() {
        this.running = false;
        clearTimeout(this.loopId);
        cancelAnimationFrame(this.animLoopId || 0);
    }

    private beginLoop() {
        let remainder = 0;
        let now = performance.now();
        const loop = () => {
            clearTimeout(this.loopId);
            this.loopId = window.setTimeout(() => {
                let diff = performance.now() - now + remainder;
                now = performance.now();
                while (diff >= TARGET_FRAME_TIME) {
                    diff -= TARGET_FRAME_TIME;

                    this.instances.forEach(instance => {
                        instance.time += TARGET_FRAME_TIME;
                        let ms = instance.options?.intervalMilliseconds || 0;
                        if (instance.time > ms) {
                            instance.callback(DELTA_TIME_SECONDS);
                            instance.time -= ms || instance.time;
                        }
                    });
                }
                remainder = diff;
                loop();
            }, TARGET_FRAME_TIME);
        }
        loop();
    }

    private beginAnimationLoop() {
        let now = performance.now();
        const loop = () => {
            let diff = performance.now() - now;
            now = performance.now();
            const dt = diff / 1000;
            for (const instance of this.animInstances.values()) {
                instance.callback(dt);
            }

            this.animLoopId = requestAnimationFrame(loop);
        }
        this.animLoopId = requestAnimationFrame(loop);
    }
}

export default new Loop();
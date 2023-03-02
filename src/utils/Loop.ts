
type Callback = (dt: number) => void;

interface Instance {
    time: number;
    id: string;
    callback: Callback;
    options?: Options;
}
interface AnimInstance extends Instance {

}
export interface Options {
    intervalMilliseconds: number;
}

const TARGET_FRAME_TIME = 1000 / 30;
const DELTA_TIME_SECONDS = TARGET_FRAME_TIME / 1000;

export default class Loop {
    public running: boolean = false;

    private readonly instances = new Map<string, Instance>();
    private readonly animInstances = new Map<string, AnimInstance>();
    private loopId = 0;
    private animLoopId = 0;
    constructor() {

    }

    subscribe(callback: Callback, options?: Options) {
        const id = crypto.randomUUID();
        const instance: Instance = { callback, time: 0, id, options };
        this.instances.set(id, instance);
        return id;
    }

    subscribeAnim(callback: Callback, options?: Options) {
        const id = crypto.randomUUID();
        const instance: AnimInstance = { callback, time: 0, id, options };
        this.animInstances.set(id, instance);
        return id;
    }

    unsubscribe(id: string | undefined) {
        if (!id) {
            return;
        }
        this.instances.delete(id);
        this.animInstances.delete(id);
    }

    reset() {
        this.instances.clear();
        this.animInstances.clear();
        this.running = false;
    }

    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.beginLoop();
        this.beginLoopAnim();
    }

    stop() {
        this.running = false;
        clearTimeout(this.loopId);
        cancelAnimationFrame(this.animLoopId || 0);
    }

    private beginLoop() {
        let remainder = 0;
        let now = performance.now();
        clearTimeout(this.loopId);
        const loop = () => {
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
                    if(diff > 2000){
                        diff = 0;
                    }
                }
                remainder = diff;
                loop();
            }, TARGET_FRAME_TIME);
        }
        loop();
    }

    private beginLoopAnim() {
        let lastTime = 0;
        cancelAnimationFrame(this.animLoopId);
        const loop = () => {
            const now = performance.now();
            const dt = (now - lastTime);
            this.animInstances.forEach(instance => {
                instance.time += dt;
                let ms = instance.options?.intervalMilliseconds || 0;
                if (instance.time > ms) {
                    instance.callback(dt / 1000);
                    instance.time -= ms || instance.time;
                }
            });
            lastTime = now;
            this.animLoopId = requestAnimationFrame(loop);
        }
        this.animLoopId = requestAnimationFrame(loop);
    }
}
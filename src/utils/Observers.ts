import Loop, { Options } from "./Loop";

export type Callback = (visible: boolean, observer: IntersectionObserver) => void;
export type Instance = { observer: IntersectionObserver, loopId?: string }
export class VisibilityObserver {
    private readonly instances: Instance[] = [];
    constructor(readonly loop?: Loop) {

    }

    disconnectAll() {
        this.instances.forEach(x => {
            x.observer.disconnect();
            if (x.loopId) {
                this.loop?.unsubscribe(x.loopId);
            }
        });
    }
    register(element: HTMLElement, callback: Callback) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(x => callback(x.isIntersecting, observer));
        });
        observer.observe(element);
        this.instances.push({ observer });
        return observer;
    }
    registerLoop(element: HTMLElement, callback: Callback, options?: Options) {
        if (!this.loop) {
            throw Error('VisibilityObserver has no loop instance');
        }
        let loopId: string | undefined;
        const observer = this.register(element, visible => {
            callback(visible, observer);
            if (visible) {
                loopId = this.loop?.subscribeAnim(() => {
                    callback(visible, observer);
                }, options);
            } else {
                this.loop?.unsubscribe(loopId);
            }
        });
        observer.observe(element);
        this.instances.push({ observer, loopId });
        return observer;
    }
}
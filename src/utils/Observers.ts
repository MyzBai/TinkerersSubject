import Loop, { Options } from "./Loop";

export type Callback = (visible: boolean, observer: IntersectionObserver) => void;
export class VisibilityObserver {
    private readonly instances: IntersectionObserver[] = [];
    private readonly loopInstances: { observer: IntersectionObserver, disconnect: () => void }[] = [];
    constructor(readonly loop?: Loop) { }

    disconnectAll() {
        this.instances.forEach(x => x.disconnect());
        this.loopInstances.forEach(x => x.disconnect());
        this.instances.splice(0);
        this.loopInstances.splice(0);
    }
    register(element: HTMLElement, callback: Callback) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(x => callback(x.isIntersecting, observer));
        });
        observer.observe(element);
        this.instances.push(observer);
        return observer;
    }
    registerLoop(element: HTMLElement, callback: Callback, options?: Options) {
        if (!this.loop) {
            throw Error('VisibilityObserver has no loop instance');
        }
        let loopId: string | undefined;
        const observer = new IntersectionObserver(entries => {
            entries.forEach(x => {
                const visible = x.isIntersecting;
                callback(visible, observer);
                if (visible) {
                    loopId = this.loop?.subscribeAnim(() => {
                        callback(visible, observer);
                    }, options);
                } else {
                    this.loop?.unsubscribe(loopId);
                }
            });
        });
        observer.observe(element);
        const disconnect = () => {
            observer.disconnect();
            this.loop?.unsubscribe(loopId);
        }
        this.loopInstances.push({ observer, disconnect });
        return { observer, disconnect }
    };
}
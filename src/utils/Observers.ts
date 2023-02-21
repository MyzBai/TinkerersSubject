import Loop, { Options } from "./Loop";

export type Callback = (visible: boolean, observer: IntersectionObserver) => void;

export class VisibilityObserver {
    private readonly _observers: (IntersectionObserver | { loop: Loop, observer: IntersectionObserver })[] = [];
    constructor() {

    }
    get observers() {
        return this._observers;
    }
    disconnectAll() {
        this._observers.forEach(x => {
            if ('loop' in x) {
                x.loop.reset();
                x.observer.disconnect();
            } else {
                x.disconnect();
            }
        });
    }
    register(element: HTMLElement, callback: Callback) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(x => callback(x.isIntersecting, observer));
        });
        observer.observe(element);
        this._observers.push(observer);
        return observer;
    }
    registerLoop(element: HTMLElement, callback: Callback, options?: Options) {
        const loop = new Loop();
        let loopId: string;
        const observer = this.register(element, (visible, observer) => {
            callback(visible, observer);
            if (visible) {
                loopId = loop.subscribe(() => { callback(visible, observer); }, options);
                loop.start();
            } else {
                loop.unsubscribe(loopId);
                loop.stop();
            }
        });
        this._observers.push({ loop, observer })
        return { loop, observer }
    }
}

// export const visibilityObserver = (element: HTMLElement, callback: Callback) => {
//     const observer = new IntersectionObserver(entries => {
//         entries.forEach(x => callback(x.isIntersecting, observer));
//     });
//     observer.observe(element);
//     return observer;
// }

// export function visibilityObserverLoop(element: HTMLElement, callback: (visible: boolean, observer: IntersectionObserver) => void, options?: Options) {
//     const loop = new Loop();
//     let loopId: string;
//     const observer = visibilityObserver(element, (visible: boolean, observer: IntersectionObserver) => {
//         callback(visible, observer);
//         if (visible) {
//             loopId = loop.subscribe(() => { callback(visible, observer); }, options);
//             loop.start();
//         } else {
//             loop.unsubscribe(loopId);
//             loop.stop();
//         }
//     });
//     return { loop, observer }
// }
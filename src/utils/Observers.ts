import Loop, { Options } from "./Loop";

export const visibilityObserver = (element: HTMLElement, callback: (visible: boolean, observer: IntersectionObserver) => void) => {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(x => callback(x.isIntersecting, observer));
    });
    observer.observe(element);
    return observer;
}

export function visibilityObserverLoop(element: HTMLElement, callback: (visible: boolean, observer: IntersectionObserver) => void, options?: Options) {
    const loop = new Loop();
    let loopId: string;
    const observer = visibilityObserver(element, (visible: boolean, observer: IntersectionObserver) => {
        callback(visible, observer);
        if (visible) {
            loopId = loop.subscribe(() => { callback(visible, observer); }, options);
            loop.start();
        } else {
            loop.unsubscribe(loopId);
            loop.stop();
        }
    });
    return { loop, observer }
}
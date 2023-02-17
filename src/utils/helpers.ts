


export const avg = (a: number, b: number) => (a + b) / 2;
export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
export const randomRangeInt = (min: number, max: number) => Math.floor(randomRange(min, max));
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => (v - a) / (b - a);
export const remap = (iMin: number, iMax: number, oMin: number, oMax: number, v: number) => lerp(oMin, oMax, invLerp(iMin, iMax, v));
export const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.port.length !== 0 || location.protocol !== 'http:';

export function queryHTML<T extends HTMLElement>(selectors: string, parent?: HTMLElement) {
    const element = (parent || document).querySelector<T>(selectors);
    if (!element) {
        throw Error(`HTMLElement with selectors ${selectors} could not be found!`);
    }
    return element;
}

export function registerMutationObserver(parentElement: HTMLElement, options: MutationObserverInit, callback: (targetElement: HTMLElement, type: 'added' | 'removed' | 'selected') => void) {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target as HTMLElement;
            for (const node of mutation.addedNodes) {
                if (node instanceof Element) {
                    callback(target, 'added');
                }
            }
            for (const node of mutation.removedNodes) {
                if (node instanceof Element) {
                    callback(target, 'removed');
                }
            }
            if (mutation.attributeName === 'class') {
                if (target.classList.contains('selected')) {
                    callback(target, 'selected');
                }
            }
        }
    });
    Array.from(parentElement.querySelectorAll<HTMLElement>('[data-tab-target]')).forEach(x => x.addEventListener('click', () => x.classList.add('selected')));
    observer.observe(parentElement, options);
    return observer;
}

/**
 * @description listens for changes to all children queried with {@link queryString}
 */
export function registerTabs(btnsParent: HTMLElement, contentsParent?: HTMLElement, callback?: (target: HTMLElement) => void, queryString = '[data-tab-target]') {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            const target = mutation.target as HTMLElement;
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    addBtn(node);
                }
            }
            if (mutation.attributeName === 'class') {
                if (target.classList.contains('selected')) {
                    const btns = Array.from(btnsParent.querySelectorAll<HTMLElement>(queryString));
                    btns.forEach(x => x.classList.toggle('selected', x === target));
                    if (contentsParent) {
                        const contents = Array.from(contentsParent.querySelectorAll<HTMLElement>('[data-tab-content]') || []);
                        const targetAttr = target.getAttribute('data-tab-target');
                        contents.forEach(x => x.classList.toggle('hidden', x.getAttribute('data-tab-content') !== targetAttr));
                    }
                    callback?.(target);
                }
            }
        }
    });
    const addBtn = (btn: HTMLElement) => {
        btn.addEventListener('click', () => {
            btn.classList.add('selected');
        });
    }
    Array.from(btnsParent.querySelectorAll<HTMLElement>(queryString)).forEach(x => addBtn(x));
    observer.observe(btnsParent, { attributes: true, subtree: true, childList: true });
    return observer;
}

export function generateTime(startTime = 0) {
    const ms = Date.now() - startTime;
    const days = Math.floor(ms / 86400000);
    const hours = (Math.floor(ms / 3600000) % 24);
    const mins = (Math.floor(ms / 60000) % 60).toFixed();
    return {
        days, hours, mins, ms
    };
}

export function highlightHTMLElement(element: HTMLElement, trigger: 'click' | 'mouseover') {
    const attr = 'data-highlight-notification';
    if (element.classList.contains('selected')) {
        return;
    }
    element.setAttribute(attr, '');
    const listener = () => {
        element.removeAttribute(attr);
        element.removeEventListener(trigger, listener);
    };
    element.addEventListener(trigger, listener);
}

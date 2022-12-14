
export const avg = (a: number, b: number) => (a + b) / 2;
export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
export const randomRangeInt = (min: number, max: number) => Math.floor(randomRange(min, max));
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

export function initTabs(btnsParent: Element | null, contentsParent: Element | null) {

    if (!btnsParent || !contentsParent) {
        console.error(btnsParent, contentsParent);
        return;
    }
    const btns = btnsParent.querySelectorAll(':scope > [data-tab-target]');
    btns.forEach(menuBtn => {
        menuBtn.addEventListener('click', () => {
            btns.forEach(x => x.classList.toggle('selected', x === menuBtn));
            const targetAttr = menuBtn.getAttribute('data-tab-target');
            const target = contentsParent.querySelector(`[data-tab-content="${targetAttr}"]`);
            Array.from(target?.parentElement?.children || []).filter(x => x.hasAttribute('data-tab-content')).forEach(x => {
                x.classList.toggle('hidden', x.getAttribute('data-tab-content') !== targetAttr);
            });
        });
    });
}


export function registerHighlightHTMLElement(element: HTMLElement, trigger: 'click' | 'mouseover') {
    const attr = 'data-highlight';
    const removeAttr = () => element.removeAttribute(attr);
    element.setAttribute(attr, '');
    switch (trigger) {
        case 'click':
            element.addEventListener('click', removeAttr);
            break;
        case 'mouseover':
            element.addEventListener('mouseover', removeAttr);
            break;
    }
}
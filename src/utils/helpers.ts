
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

export const highlightHTMLElement = (() => {
    type Trigger = 'click' | 'mouseover';
    const attributeName = 'data-highlight-notification';

    class Node {
        element: HTMLElement;
        parent: Node | null;
        isRoot: boolean;
        trigger: Trigger;
        constructor(element: HTMLElement, parent: Node | null, isRoot: boolean, trigger: Trigger) {
            this.element = element;
            this.parent = parent;
            this.isRoot = isRoot;
            this.trigger = trigger;
            if (!isRoot) {
                const listener = () => {
                    element.removeEventListener(trigger, listener);
                    element.removeAttribute(attributeName);
                    this.parent?.evaluate();
                }
                element.addEventListener(trigger, listener);
            }

        }
        evaluate() {
            const children = nodes.filter(x => x.parent === this);
            if (children.length === 0) {
                return;
            }
            const test = children.some(x => x.element.hasAttribute(attributeName));
            if (!test) {
                this.element.removeAttribute(attributeName);
                this.parent?.evaluate();
            }
        }
    }
    const nodes = [] as Node[];
    function register(roots: HTMLElement[], elements: HTMLElement[], trigger: Trigger) {

        let parent: Node = null;
        for (const root of roots) {
            let rootNode = nodes.find(x => x.element === root);
            if(!rootNode){
                rootNode = new Node(root, parent, true, trigger);
                nodes.push(rootNode);
            }
            parent = rootNode;
        }
        for (const element of elements) {
            const node = new Node(element, parent, false, 'click');
            nodes.push(node);
        }

        [...roots, ...elements].forEach(x => x.setAttribute(attributeName, ''));
    }
    return {
        register,
    }
})();
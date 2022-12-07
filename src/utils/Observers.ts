export const visibilityObserver = (element: HTMLElement, callback: (visible: boolean) => void) => {
    const observer = new IntersectionObserver(observe);
    observer.observe(element);
    return observer;
    function observe(entries: IntersectionObserverEntry[], observer: IntersectionObserver){
        entries.forEach(entry => {
            callback(entry.isIntersecting);
        });
    }
}
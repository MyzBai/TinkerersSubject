import EventEmitter from "./EventEmitter";

type EventType = 'change' | 'set' | 'add' | 'subtract';
type Callback = (v: number) => void;

export default class Value{
    private readonly defaultValue: number;
    private value: number;
    private readonly listeners = new Map<EventType, EventEmitter<number>>([
        ['change', new EventEmitter<number>()],
        ['set', new EventEmitter<number>()],
        ['add', new EventEmitter<number>()],
        ['subtract', new EventEmitter<number>()],
    ]);
    constructor(defaultValue: number) {
        this.defaultValue = defaultValue;
        this.value = defaultValue;
    }

    set(v: number) {
        this.value = v;
        this.listeners.get('set')?.invoke(this.value);
        this.listeners.get('change')?.invoke(this.value);
    }
    get() {
        return this.value;
    }
    add(v: number) {
        this.value += v;
        this.listeners.get('add')?.invoke(this.value);
        this.listeners.get('change')?.invoke(this.value);
    }
    subtract(v: number) {
        this.value -= v;
        this.listeners.get('subtract')?.invoke(this.value);
        this.listeners.get('change')?.invoke(this.value);
    }

    reset() {
        this.value = this.defaultValue;
        this.listeners.forEach(x => x.removeAllListeners());
    }

    addListener(type: EventType, callback: Callback) {
        this.listeners.get(type)?.listen(callback);
    }

    removeListener(type: EventType, callback: Callback) {
        this.listeners.get(type)?.removeListener(callback);
    }
}
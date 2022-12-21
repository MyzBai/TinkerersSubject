import EventEmitter from "./EventEmitter";

type EventType = 'set' | 'add' | 'subtract';
type Callback<T> = (v: T) => void;

export default class Value<T>{
    private readonly defaultValue: T;
    private value: T;
    private _onChange = new EventEmitter<T>();
    private readonly listeners: Map<EventType, EventEmitter<T>>;
    constructor(defaultValue: T) {
        this.defaultValue = defaultValue;
        this.value = defaultValue;

        this.listeners = new Map<EventType, EventEmitter<T>>([
            ['set', new EventEmitter<T>()],
            ['add', new EventEmitter<T>()],
            ['subtract', new EventEmitter<T>()],
        ]);
    }

    get onChange() { return this._onChange; }

    set(v: T) {
        this.value = v;
        // if (!suppressEvent) {
        //     this.onChange.invoke(this.value);
        // }
        this.listeners.get('set')?.invoke(this.value);
    }
    get() {
        return this.value;
    }
    add(v: number) {
        if (typeof this.value === 'number') {
            (this.value as number) += v;
            this.onChange.invoke(this.value);
        }
        this.listeners.get('add')?.invoke(this.value);
    }
    subtract(v: number) {
        if (typeof this.value === 'number') {
            (this.value as number) -= v;
            this.onChange.invoke(this.value);
        }
        this.listeners.get('subtract')?.invoke(this.value);
    }

    reset() {
        this.value = this.defaultValue;
        this.onChange.removeAllListeners();
    }

    addListener(type: EventType, callback: Callback<T>) {
        this.listeners.get(type)?.listen(callback);
    }

    removeListener(type: EventType, id: number) {
        this.listeners.get(type)?.removeListener(id);
    }
}
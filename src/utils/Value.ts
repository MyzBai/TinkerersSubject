import EventEmitter from "./EventEmitter";

export default class Value<T>{
    private readonly defaultValue: T;
    private value: T;
    private _onChange: EventEmitter<T>;
    constructor(defaultValue: T) {
        this.defaultValue = defaultValue;
        this.value = defaultValue;
        this._onChange = new EventEmitter<T>();
    }

    get onChange() { return this._onChange; }

    set(v: T, suppressEvent = false) {
        this.value = v;
        if(!suppressEvent){
            this.onChange.invoke(this.value);
        }
    }
    get() {
        return this.value;
    }
    add(v: number) {
        if (typeof this.value === 'number') {
            (this.value as number) += v;
            this.onChange.invoke(this.value);
        }
    }
    subtract(v: number) {
        if (typeof this.value === 'number') {
            (this.value as number) -= v;
            this.onChange.invoke(this.value);
        }
    }

    reset() {
        this.value = this.defaultValue;
        this.onChange.removeAllListeners();
    }
}
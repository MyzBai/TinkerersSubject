import EventEmitter from "./EventEmitter";

export default class Value<T>{
    #defaultValue: T;
    #value: T;
    #onChange: EventEmitter<T>;
    constructor(defaultValue: T) {
        this.#defaultValue = defaultValue;
        this.#value = defaultValue;
        this.#onChange = new EventEmitter<T>();
    }

    get value() {
        return this.#value;
    }
    get onChange() {
        return this.#onChange;
    }

    set(v: T) {
        this.#value = v;
        this.#onChange.invoke(this.#value);
    }
    get() {
        return this.#value;
    }
    add(v: number) {
        if (typeof this.#value === 'number') {
            (this.#value as number) += v;
            this.#onChange.invoke(this.#value);
        }
    }
    subtract(v: number) {
        if (typeof this.#value === 'number') {
            (this.#value as number) -= v;
            this.#onChange.invoke(this.#value);
        }
    }

    reset(){
        this.#value = this.#defaultValue;
        this.#onChange.removeAllListeners();
    }
}
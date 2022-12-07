type Callback<T> = (args: T) => void;
interface CallbackOptions {
    once?: boolean;
}
type Listener<T> = { id: number, callback: Callback<T>, opts?: CallbackOptions }

export default class EventEmitter<T>{
    #listeners = new Map<number, Listener<T>>;
    #counter = 0;
    constructor() {

    }

    listen(callback: Callback<T>, opts?: CallbackOptions) {
        const id = this.#counter++;
        const instance = { callback, id, opts };
        this.#listeners.set(id, instance);
        return id;
    }
    removeListener(id: number) {
        this.#listeners.delete(id);
    }
    removeAllListeners() {
        this.#listeners.clear();
    }

    invoke(args: T) {
        this.#listeners.forEach(x => {
            x.callback(args);
        });
        for (const [key, value] of this.#listeners.entries()) {
            if(value.opts?.once){
                this.#listeners.delete(key);
            }
        }
    }
}
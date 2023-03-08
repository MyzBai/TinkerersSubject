type Callback<T> = (args: T) => void;
interface CallbackOptions {
    once?: boolean;
}
type Listener<T> = { callback: Callback<T>, opts?: CallbackOptions }

export default class EventEmitter<T> {
    private readonly listeners = new Map<Callback<T>, Listener<T>>;

    listen(callback: Callback<T>, opts?: CallbackOptions) {
        const instance = { callback, opts };
        this.listeners.set(callback, instance);
    }
    removeListener(callback: Callback<T>) {
        this.listeners.delete(callback);
    }
    removeAllListeners() {
        this.listeners.clear();
    }

    invoke(args: T) {
        this.listeners.forEach(x => {
            x.callback(args);
        });
        for (const [key, value] of this.listeners.entries()) {
            if (value.opts?.once) {
                this.listeners.delete(key);
            }
        }
    }
}
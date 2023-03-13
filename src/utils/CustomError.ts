export default class CustomError extends Error {
    constructor(msg: string) {
        super(msg);
        // Object.setPrototypeOf(this, CustomError.prototype);
    }
}
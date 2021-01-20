import { DatabaseDriver } from './database-driver';

export class LocalDatabase implements DatabaseDriver {
    /**
     * The key-value storage.
     *
     * @type {object}
     */
    protected storage = {
        //
    };

    /**
     * Create a new cache instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        //
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return new Promise(resolve => resolve(this.storage[key] || null));
    }

    /**
     * Store data to cache.
     *
     * @param {string} key
     * @param {any} value
     * @return {void}
     */
    set(key: string, value: any): void {
        this.storage[key] = value;
    }
}

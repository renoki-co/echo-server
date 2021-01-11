import { DatabaseDriver } from './database-driver';

const Redis = require('ioredis');

export class RedisDatabase implements DatabaseDriver {
    /**
     * Redis client.
     */
    protected _redis: any;

    /**
     *
     * KeyPrefix for used in the redis Connection
     *
     * @type {String}
     */
    protected _keyPrefix: string;

    /**
     * Create a new cache instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        this._redis = new Redis(options.database.redis);
        this._keyPrefix = options.database.redis.keyPrefix || '';
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }

    /**
     * Store data to cache.
     *
     * @param {string} key
     * @param {any} value
     */
    set(key: string, value: any): void {
        this._redis.set(key, JSON.stringify(value));
    }
}

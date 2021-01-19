import { DatabaseDriver } from './database-driver';

const Redis = require('ioredis');

export class RedisDatabase implements DatabaseDriver {
    /**
     * Redis client.
     *
     * @type {any}
     */
    protected redis: any;

    /**
     *
     * KeyPrefix for used in the redis Connection
     *
     * @type {string}
     */
    protected keyPrefix: string;

    /**
     * Create a new cache instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        this.redis = new Redis(options.database.redis);
        this.keyPrefix = options.database.redis.keyPrefix || '';
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    get(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }

    /**
     * Store data to cache.
     *
     * @param {string} key
     * @param {any} value
     * @return {void}
     */
    set(key: string, value: any): void {
        this.redis.set(key, JSON.stringify(value));
    }
}

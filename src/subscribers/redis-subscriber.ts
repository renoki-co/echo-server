const Redis = require('ioredis');
import { Log } from './../log';
import { Subscriber } from './subscriber';

export class RedisSubscriber implements Subscriber {
    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _redis: any;

    /**
     *
     * KeyPrefix for used in the redis Connection
     *
     * @type {String}
     */
    private _keyPrefix: string;

    /**
     * Create a new instance of subscriber.
     *
     * @param {any} options
     */
    constructor(private options) {
        this._keyPrefix = options.database.redis.keyPrefix || '';
        this._redis = new Redis(options.database.redis);
    }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {Promise<void>}
     */
    subscribe(callback): Promise<void> {
        return new Promise((resolve, reject) => {
            this._redis.on('pmessage', (subscribed, channel, message) => {
                // Ignore socket.io-redis adapter messages.
                if (channel.startsWith('redis-adapter')) {
                    return;
                }

                try {
                    message = JSON.parse(message);

                    if (this.options.development) {
                        Log.info({ channel, event: JSON.stringify(message.event) });
                    }

                    callback(channel.substring(this._keyPrefix.length), message);
                } catch (e) {
                    if (this.options.development) {
                        Log.info('No JSON message.');
                    }
                }
            });

            this._redis.psubscribe(`${this._keyPrefix}*`, (err, count) => {
                if (err) {
                    reject('Redis could not subscribe.');
                }

                Log.success('Listening for redis events...');

                resolve();
            });
        });
    }

    /**
     * Unsubscribe from events to broadcast.
     *
     * @return {Promise<void>}
     */
    unsubscribe(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this._redis.disconnect();
                resolve();
            } catch(e) {
                reject('Could not disconnect from redis -> ' + e);
            }
        });
    }
}

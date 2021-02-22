import { App } from './../app';
import { RedlockMutex } from 'redis-semaphore';
import { StatsDriver } from './stats-driver';

const dayjs = require('dayjs');
const Redis = require('ioredis');

export class RedisStats implements StatsDriver {
    /**
     * The Redis.IO client.
     *
     * @type {Redis}
     */
    protected redis: typeof Redis;

    /**
     * The setlist name for storing temporarily the stats.
     *
     * @type {string}
     */
    protected setListName = 'stats:apps';

    /**
     * Initialize the Redis stats driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        this.redis = new Redis(options.database.redis);
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.ensureSetListExists(app).then(() => {
            return this.redis.hincrby(this.getKey(app, 'stats'), 'connections', 1).then(currentConnections => {
                return this.recalculatePeakConnections(app, currentConnections).then(peakConnections => currentConnections);
            });
        });
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @param  {string|null}  reason
     * @return {Promise<number>}
     */
    markDisconnection(app: App, reason?: string): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.ensureSetListExists(app).then(() => {
            return this.redis.hincrby(this.getKey(app, 'stats'), 'connections', -1).then(currentConnections => {
                return this.recalculatePeakConnections(app, currentConnections).then(peakConnections => currentConnections);
            });
        });
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.ensureSetListExists(app).then(() => this.redis.hincrby(this.getKey(app, 'stats'), 'api_messages', 1));
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number> {
        if (!this.canRegisterStats(app)) {
            return new Promise(resolve => resolve(0));
        }

        return this.ensureSetListExists(app).then(() => this.redis.hincrby(this.getKey(app, 'stats'), 'ws_messages', 1));
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string): Promise<any> {
        return this.redis.hgetall(this.getKey(app, 'stats')).then(response => {
            return {
                connections: parseInt(response.connections || 0),
                peak_connections: parseInt(response.peak_connections || 0),
                api_messages: parseInt(response.api_messages || 0),
                ws_messages: parseInt(response.ws_messages || 0),
            };
        });
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<any>}
     */
    takeSnapshot(app: App|string, time?: number): Promise<any> {
        let mutex = this.mutex(app);

        return mutex.acquire().then(() => {
            return this.getStats(app).then(stats => {
                let record = {
                    time, stats,
                };

                return this.redis.zadd(this.getKey(app, 'snapshots'), time, JSON.stringify(record)).then(() => {
                    return this.resetMessagesStats(app, stats.connections).then(() => {
                        mutex.release();

                        return record;
                    });
                });
            });
        });
    }

    /**
     * Get the list of stats snapshots
     * for a given interval.
     * Defaults to the last 7 days.
     *
     * @param  {App|string}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<any>}
     */
    getSnapshots(app: App|string, start?: number, end?: number): Promise<any> {
        start = start ? start : dayjs().subtract(7, 'day').unix(),
        end = end ? end : dayjs().unix();

        return this.redis
            .zrangebyscore(this.getKey(app, 'snapshots'), start, end)
            .then(points => points.map(point => JSON.parse(point)));
    }

    /**
     * Delete points that are outside of the desired range
     * of keeping the history of.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<boolean>}
     */
    deleteStalePoints(app: App|string, time?: number): Promise<boolean> {
        return this.redis.zremrangebyscore(
            this.getKey(app, 'snapshots'),
            0,
            time - this.options.stats.retention.period - 1
        ).then(() => true);
    }

    /**
     * Create a setlist with the given name.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    protected ensureSetListExists(app: App|string): Promise<any>
    {
        let appKey = app instanceof App ? app.key : app;

        return this.redis.sadd(this.setListName, appKey);
    }

    /**
     * Get a key for the given app & suffixes.
     *
     * @param  {App|string}  app
     * @param  {array}  suffixes
     */
    protected getKey(app: App|string, ...suffixes: string[]) {
        let appKey = app instanceof App ? app.key : app;
        let compiledSuffixes = suffixes.join(':');

        return appKey + (compiledSuffixes ? `:${compiledSuffixes}` : '');
    }

    /**
     * Recalculate the peak_connections variable for an app
     * given the current connections number.
     *
     * @param  {App|string}  app
     * @param  {number}  currentConnections
     * @return {Promise<number>}
     */
    protected recalculatePeakConnections(app: App|string, currentConnections: number) {
        return this.redis.hget(this.getKey(app, 'stats'), 'peak_connections').then(peakConnections => {
            peakConnections = peakConnections
                ? Math.max(peakConnections, currentConnections)
                : currentConnections;

            return this.redis.hset(this.getKey(app, 'stats'), 'peak_connections', peakConnections).then(() => {
                return peakConnections;
            });
        });
    }

    /**
     * Get the mutex for the app.
     *
     * @param  {App|string}  app
     * @return {RedlockMutex}
     */
    protected mutex(app: App|string): RedlockMutex {
        return new RedlockMutex(
            [this.redis],
            this.getKey(app, 'lock'),
            {
                lockTimeout: this.options.stats.snapshots.interval * 1000,
                refreshInterval: 0,
            },
        );
    }

    /**
     * Reset the messages counters after each snapshot,
     * maintaining the connections number.
     *
     * @param  {App|string}  app
     * @param  {number}  connections
     * @return {void}
     */
    protected resetMessagesStats(app: App|string, connections: number): Promise<any> {
        return Promise.all([
            this.ensureSetListExists(app).then(() => this.redis.hset(this.getKey(app, 'stats'), 'api_messages', 0)),
            this.ensureSetListExists(app).then(() => this.redis.hset(this.getKey(app, 'stats'), 'ws_messages', 0)),
            this.ensureSetListExists(app).then(() => this.redis.hset(this.getKey(app, 'stats'), 'peak_connections', connections)),
        ]);
    }

    /**
     * Check if the given app can register stats.
     *
     * @param  {App}  app
     * @return {boolean}
     */
    protected canRegisterStats(app: App): boolean {
        return this.options.stats.enabled && !!app.enableStats;
    }
}

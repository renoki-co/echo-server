import { App } from './../app';
import { StatsDriver } from './stats-driver';
import * as dot from 'dot-wild';

export class LocalStats implements StatsDriver {
    /**
     * The stored stats.
     *
     * @type {any}
     */
    protected stats: any = {
        //
    };

    /**
     * The stored snapshots, keyed by time.
     *
     * @type {any}
     */
    protected snapshots: any = {
        //
    };

    /**
     * Initialize the local stats driver.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        //
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number> {
        return new Promise(resolve => {
            this.increment(app, 'connections').then(connections => {
                let peakConnections = Math.max(
                    this.stats[app.key]['peak_connections'] || 0,
                    connections,
                );

                this.set(app, 'peak_connections', peakConnections).then(() => {
                    resolve(connections);
                });
            })
        });
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markDisconnection(app: App): Promise<number> {
        return new Promise(resolve => resolve(this.decrement(app, 'connections')));
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number> {
        return new Promise(resolve => resolve(this.increment(app, 'api_messages')));
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number> {
        return new Promise(resolve => resolve(this.increment(app, 'ws_messages')));
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string): Promise<any> {
        let appKey = app instanceof App ? app.key : app;

        return new Promise(resolve => {
            resolve({
                connections: this.stats[appKey] ? (this.stats[appKey]['connections'] || 0) : 0,
                peak_connections: this.stats[appKey] ? (this.stats[appKey]['peak_connections'] || 0) : 0,
                api_messages: this.stats[appKey] ? (this.stats[appKey]['api_messages'] || 0) : 0,
                ws_messages: this.stats[appKey] ? (this.stats[appKey]['ws_messages'] || 0) : 0,
            });
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
        let appKey = app instanceof App ? app.key : app;

        time = time ? time : Date.now();

        if (!this.snapshots[appKey]) {
            this.snapshots[appKey] = [];
        }

        return this.getStats(app).then(stats => {
            let record = {
                time: (time/1000).toFixed(0),
                stats,
            };

            this.snapshots[appKey].push(record);
            this.resetMessagesStats(app);

            return record;
        });
    }

    /**
     * Get the list of stats snapshots
     * for a given interval. Defaults to
     * the last 7 days.
     *
     * @param  {App|string}  app
     * @param  {number|null}  start
     * @param  {number|null}  end
     * @return {Promise<any>}
     */
    getSnapshots(app: App|string, start?: number, end?: number): Promise<any> {
        let appKey = app instanceof App ? app.key : app;

        start = start ? start : Date.now() - (7 * 24 * 60 * 60 * 1000); // 7d
        end = end ? end : Date.now();

        return new Promise(resolve => resolve(
            (this.snapshots[appKey] || []).filter(point => start <= point.time && point.time <= end)
        ));
    }

    /**
     * Increment a given stat.
     *
     * @param  {App}  app
     * @param  {string}  stat
     * @return {Promise<number>}
     */
    protected increment(app: App, stat: string): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            if (dot.has(this.stats, `${app.key}.${stat}`)) {
                this.stats[app.key][stat]++;
                resolve(this.stats[app.key][stat]);
            } else {
                this.stats = dot.set(this.stats, `${app.key}.${stat}`, 1);
                resolve(1);
            }
        });
    }

    /**
     * Decrement a given stat.
     *
     * @param  {App}  app
     * @param  {string}  stat
     * @return {Promise<number>}
     */
    protected decrement(app: App, stat: string): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            if (dot.has(this.stats, `${app.key}.${stat}`) && this.stats[app.key][stat] > 0) {
                this.stats[app.key][stat]--;
                resolve(this.stats[app.key][stat]);
            } else {
                this.stats = dot.set(this.stats, `${app.key}.${stat}`, 0);
                resolve(0);
            }
        });
    }

    /**
     * Set a metric to a certain number.
     *
     * @param  {App}  app
     * @param  {string}  stat
     * @param  {number}  value
     * @return {Promise<number>}
     */
    protected set(app: App, stat: string, value: number): Promise<number> {
        return new Promise(resolve => {
            if (!this.canRegisterStats(app)) {
                return resolve(0);
            }

            this.stats[app.key][stat] = value;

            resolve(value);
        });
    }

    /**
     * Reset the messages counters after each snapshot.
     *
     * @param  {App|string}  app
     * @return {void}
     */
    protected resetMessagesStats(app: App|string): void {
        let appKey = app instanceof App ? app.key : app;

        this.stats[appKey]['api_messages'] = 0;
        this.stats[appKey]['ws_messages'] = 0;

        this.stats[appKey]['peak_connections'] = this.stats[appKey]['connections'] || 0;
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

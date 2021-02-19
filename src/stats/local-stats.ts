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
        return new Promise(resolve => resolve(this.increment(app, 'connections')));
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
     * Refreshes the max number of connections for the app.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    refreshMaxConnections(app: App): Promise<number> {
        return this.set(app, 'max_connections', app.maxConnections);
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App}  app
     * @return {Promise<any>}
     */
    getStats(app: App): Promise<any> {
        return new Promise(resolve => {
            resolve({
                connections: this.stats[app.key] ? (this.stats[app.key]['connections'] || 0) : 0,
                api_messages: this.stats[app.key] ? (this.stats[app.key]['api_messages'] || 0) : 0,
                ws_messages: this.stats[app.key] ? (this.stats[app.key]['ws_messages'] || 0) : 0,
                max_connections: this.stats[app.key] ? (this.stats[app.key]['max_connections'] || 0) : 0,
            });
        });
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
     * Check if the given app can register stats.
     *
     * @param  {App}  app
     * @return {boolean}
     */
    protected canRegisterStats(app: App): boolean {
        return this.options.stats.enabled && !!app.enableStats;
    }
}

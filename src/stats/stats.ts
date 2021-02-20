import { App } from './../app';
import { LocalStats } from './local-stats';
import { StatsDriver } from './stats-driver';

export class Stats implements StatsDriver {
    /**
     * Stats driver.
     *
     * @type {StatsDriver}
     */
    protected driver: StatsDriver;

    /**
     * Initialize the stats driver.
     *
     * @param {any} options
     */
    constructor(options: any) {
        if (options.stats.driver === 'local') {
            this.driver = new LocalStats(options);
        }
    }

    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number> {
        return this.driver.markNewConnection(app);
    }

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markDisconnection(app: App): Promise<number> {
        return this.driver.markDisconnection(app);
    }

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number> {
        return this.driver.markApiMessage(app);
    }

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number> {
        return this.driver.markWsMessage(app);
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string): Promise<any> {
        return this.driver.getStats(app);
    }

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {void}
     */
    takeSnapshot(app: App|string, time?: number): void {
        return this.driver.takeSnapshot(app, time);
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
        return this.driver.getSnapshots(app, start, end);
    }
}

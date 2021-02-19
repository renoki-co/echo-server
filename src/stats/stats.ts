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
     * Refreshes the max number of connections for the app.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    refreshMaxConnections(app: App): Promise<number> {
        return this.driver.refreshMaxConnections(app);
    }

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App}  app
     * @return {Promise<any>}
     */
    getStats(app: App): Promise<any> {
        return this.driver.getStats(app);
    }
}

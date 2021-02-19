import { App } from './../app';

export interface StatsDriver {
    /**
     * Mark in the stats a new connection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markNewConnection(app: App): Promise<number>;

    /**
     * Mark in the stats a socket disconnection.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markDisconnection(app: App): Promise<number>;

    /**
     * Mark in the stats a new API message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markApiMessage(app: App): Promise<number>;

    /**
     * Mark in the stats a whisper message.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    markWsMessage(app: App): Promise<number>;

    /**
     * Refreshes the max number of connections for the app.
     * Returns a number within a promise.
     *
     * @param  {App}  app
     * @return {Promise<number>}
     */
    refreshMaxConnections(app: App): Promise<number>;

    /**
     * Get the compiled stats for a given app.
     *
     * @param  {App}  app
     * @return {Promise<any>}
     */
    getStats(app: App): Promise<any>;
}

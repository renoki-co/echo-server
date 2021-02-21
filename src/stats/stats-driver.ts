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
     * Get the compiled stats for a given app.
     *
     * @param  {App|string}  app
     * @return {Promise<any>}
     */
    getStats(app: App|string): Promise<any>;

    /**
     * Take a snapshot of the current stats
     * for a given time.
     *
     * @param  {App|string}  app
     * @param  {number|null}  time
     * @return {Promise<any>}
     */
    takeSnapshot(app: App|string, time?: number): Promise<any>;

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
    getSnapshots(app: App|string, start?: number, end?: number): Promise<any>;
}

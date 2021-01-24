import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { ArrayAppManager } from './array-app-manager';
import { Log } from './../log';
import { ApiAppManager } from './api-app-manager';

/**
 * Class that controls the key/value data store.
 */
export class AppManager implements AppManagerDriver {
    /**
     * App manager driver.
     */
    protected driver: AppManagerDriver;

    /**
     * Create a new database instance.
     *
     * @param {any} options
     */
    constructor(protected options: any) {
        if (options.appManager.driver === 'array') {
            this.driver = new ArrayAppManager(options);
        } else if (options.appManager.driver === 'api') {
            this.driver = new ApiAppManager(options);
        } else {
            Log.error('Clients driver not set.');
        }
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string, socket: any, data: any): Promise<App|null> {
        return this.driver.findById(id, socket, data);
    }

    /**
     * Find an app by given key.
     *
     * @param  {string}  key
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key: string, socket: any, data: any): Promise<App|null> {
        return this.driver.findByKey(key, socket, data);
    }
}

import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { ArrayAppManager } from './array-app-manager';
import { Log } from './../log';

/**
 * Class that controls the key/value data store.
 */
export class AppManager implements AppManagerDriver {
    /**
     * App manager driver.
     */
    private driver: AppManagerDriver;

    /**
     * Create a new database instance.
     *
     * @param {any} options
     */
    constructor(private options: any) {
        if (options.appManager.driver === 'array') {
            this.driver = new ArrayAppManager(options);
        } else {
            Log.error('Clients driver not set.');
        }
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @return {App|null}
     */
    find(id: string|number): App|null {
        return this.driver.find(id);
    }
}

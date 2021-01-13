import { AppManagerDriver } from './app-manager-driver';
import { App } from './../app';

export class ArrayAppManager implements AppManagerDriver {
    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        //
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    find(id: string|number, socket: any, data: any): Promise<App|null> {
        return new Promise((resolve, reject) => {
            let app = this.options.appManager.array.apps.find(app => app.id === id);

            if (typeof app !== 'undefined') {
                resolve(new App(app.id, app.key, app.secret));
            } else {
                reject({ reason: `App ${id} not found.` });
            }
        });
    }
}

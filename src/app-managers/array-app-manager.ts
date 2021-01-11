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
     * @return {App|null}
     */
    find(id: string|number): App|null {
        let app = this.options.appManager.array.apps.find(app => app.id === id);

        return typeof app !== 'undefined'
            ? new App(app.id, app.key, app.secret)
            : null
    }
}

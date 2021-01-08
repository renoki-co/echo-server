import { AppManagerDriver } from './app-manager-driver';
import { App } from './../app';

export class ArrayAppManager implements AppManagerDriver {
    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(private options) {
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
            ? new App(app.id, app.secret)
            : null
    }

    /**
     * Check if the given secret belongs to the app.
     *
     * @param  {string|number}  id
     * @param  {string}  secret
     * @return {boolean}
     */
    verifySecret(id: string|number, secret: string): boolean {
        let app = this.find(id);

        return app && app.secret === secret;
    }
}

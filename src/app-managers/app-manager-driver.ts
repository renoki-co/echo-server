import { App } from './../app';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @return {App|null}
     */
    find(id: string|number): App|null;

    /**
     * Check if the given secret belongs to the app.
     *
     * @param  {string|number}  id
     * @param  {string}  secret
     * @return {boolean}
     */
    verifySecret(id: string|number, secret: string): boolean;
}

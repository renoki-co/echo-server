import { App } from './../app';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @return {App|null}
     */
    find(id: string|number): App|null;
}

import { App } from './../app';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string|number}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    find(id: string|number, socket: any, data: any): Promise<App|null>;
}

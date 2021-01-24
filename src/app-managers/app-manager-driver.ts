import { App } from './../app';

export interface AppManagerDriver {
    /**
     * Find an app by given ID.
     *
     * @param  {string}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findById(id: string, socket: any, data: any): Promise<App|null>;

    /**
     * Find an app by given key.
     *
     * @param  {string}  key
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    findByKey(key, socket: any, data: any): Promise<App|null>;
}

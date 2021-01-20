import { App } from './../app';
import { AppManagerDriver } from './app-manager-driver';
import { Log } from './../log';
import { SocketRequester } from '../socket-requester';

export class ApiAppManager implements AppManagerDriver {
    /**
     * The request client to authenticate on.
     *
     * @type {SocketRequester}
     */
    protected socketRequester;

    /**
     * Create a new app manager instance.
     *
     * @param {any} options
     */
    constructor(protected options) {
        this.socketRequester = new SocketRequester(options);
    }

    /**
     * Find an app by given ID.
     *
     * @param  {string}  id
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<App|null>}
     */
    find(id: string, socket: any, data: any): Promise<App|null> {
        let options = {
            url: `${this.options.appManager.api.host}${this.options.appManager.api.endpoint}`.replace(':appId', id) + `?token=${this.options.appManager.api.token}`,
            headers: (data && data.auth && data.auth.headers) ? data.auth.headers : {},
            method: 'get',
            rejectUnauthorized: false,
        };

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                options,
                action: 'find_app',
                status: 'preparing',
            });
        }

        return new Promise((resolve, reject) => {
            this.socketRequester.serverRequest(socket, options).then(body => {
                if (this.options.development) {
                    Log.info({
                        time: new Date().toISOString(),
                        options,
                        action: 'find_app',
                        status: 'found',
                        app: body.app,
                    });
                }

                resolve(new App(body.app));
            }, error => {
                if (this.options.development) {
                    Log.error(error);
                }

                reject(error);
            });
        });
    }
}

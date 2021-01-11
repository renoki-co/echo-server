import { Channel } from './channel';
import { Log } from './../log';

const request = require('request');
const url = require('url');

export class PrivateChannel extends Channel {
    /**
     * Request client.
     */
    protected request: any;

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} options
     */
    constructor(protected io, protected options) {
        super(io, options);

        this.request = request;
    }

    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket, data): Promise<any> {
        return new Promise((resolve, reject) => {
            this.authenticate(socket, data).then(res => {
                super.join(socket, data).then(({ socket, data }) => resolve(res));
            }, error => {
                if (this.options.development) {
                    Log.error(error.reason);
                }

                this.io.of(this.getNspForSocket(socket))
                    .to(socket.id)
                    .emit('subscription_error', data.channel, error.status);

                reject(error);
            });
        });
    }

    /**
     * Send authentication request to application server.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    protected authenticate(socket: any, data: any): Promise<any> {
        let options = {
            url: this.authHost(socket) + this.options.auth.endpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {},
            rejectUnauthorized: false
        };

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                options,
                action: 'auth',
                status: 'preparing',
            });
        }

        return this.serverRequest(socket, options);
    }

    /**
     * Get the auth host based on the Socket.
     *
     * @param  {any}  socket
     * @return {string}
     */
    protected authHost(socket: any): string {
        let authHosts = (this.options.auth.host) ? this.options.auth.host : this.options.host;

        if (typeof authHosts === 'string') {
            authHosts = [authHosts];
        }

        let authHostSelected = authHosts[0] || 'http://127.0.0.1';

        if (socket.request.headers.referer) {
            let referer = url.parse(socket.request.headers.referer);

            for (let authHost of authHosts) {
                authHostSelected = authHost;

                if (this.hasMatchingHost(referer, authHost)) {
                    authHostSelected = `${referer.protocol}//${referer.host}`;
                    break;
                }
            }
        }

        return authHostSelected;
    }

    /**
     * Check if there is a matching auth host.
     *
     * @param  {any}  referer
     * @param  {any}  host
     * @return {boolean}
     */
    protected hasMatchingHost(referer: any, host: any): boolean {
        return (referer.hostname && referer.hostname.substr(referer.hostname.indexOf('.')) === host) ||
            `${referer.protocol}//${referer.host}` === host ||
            referer.host === host;
    }

    /**
     * Send a request to the server.
     *
     * @param  {any}  socket
     * @param  {any}  options
     * @return {Promise<any>}
     */
    protected serverRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);

            let body;

            this.request.post(options, (error, response, body, next) => {
                if (error) {
                    if (this.options.development) {
                        Log.error({
                            time: new Date().toISOString(),
                            socketId: socket.id,
                            options,
                            action: 'auth',
                            status: 'failed',
                            error,
                        });
                    }

                    reject({ reason: 'Error sending authentication request.', status: 0 });
                } else if (response.statusCode !== 200) {
                    if (this.options.development) {
                        Log.warning({
                            time: new Date().toISOString(),
                            socketId: socket.id,
                            options,
                            action: 'auth',
                            status: 'non_200',
                            body: response.body,
                            error,
                        });
                    }

                    reject({ reason: 'Client can not be authenticated, got HTTP status ' + response.statusCode, status: response.statusCode });
                } else {
                    if (this.options.development) {
                        Log.info({
                            time: new Date().toISOString(),
                            socketId: socket.id,
                            options,
                            action: 'auth',
                            status: 'success',
                        });
                    }

                    try {
                        body = JSON.parse(response.body);
                    } catch (e) {
                        body = response.body
                    }

                    resolve(body);
                }
            });
        });
    }

    /**
     * Prepare headers for request to app server.
     *
     * @param  {any}  socket
     * @param  {any}  options
     * @return {any}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['Cookie'] = options.headers['Cookie'] || socket.request.headers.cookie;
        options.headers['X-Requested-With'] = 'XMLHttpRequest';
        options.headers['User-Agent'] = socket.request.headers['user-agent'];
        options.headers['X-Forwarded-For'] = socket.request.headers['x-forwarded-for'] || socket.conn.remoteAddress;

        return options.headers;
    }
}

import { Channel } from './channel';
import { Log } from './../log';
import { SocketRequester } from '../socket-requester';

const url = require('url');

export class PrivateChannel extends Channel {
    /**
     * The request client to authenticate on.
     *
     * @type {SocketRequester}
     */
    protected _socketRequester;

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} options
     */
    constructor(protected io, protected options) {
        super(io, options);
        this._socketRequester = new SocketRequester(options);
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
            url: this.getAuthenticatonHost(socket) + this.options.auth.endpoint,
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

        return this._socketRequester.serverRequest(socket, options);
    }

    /**
     * Get the auth host based on the Socket.
     *
     * @param  {any}  socket
     * @return {string}
     */
    protected getAuthenticatonHost(socket: any): string {
        let authHosts = this.options.auth.host ? this.options.auth.host : this.options.host;

        if (typeof authHosts === 'string') {
            authHosts = [authHosts];
        }

        let selectedAuthHost = authHosts[0] || 'http://127.0.0.1';

        if (socket.request.headers.referer) {
            let referer = url.parse(socket.request.headers.referer);

            for (let authHost of authHosts) {
                selectedAuthHost = authHost;

                if (this.hasMatchingHost(referer, authHost)) {
                    selectedAuthHost = `${referer.protocol}//${referer.host}`;
                    break;
                }
            }
        }

        return selectedAuthHost;
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
}

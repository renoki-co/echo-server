import { Log } from './log';

const request = require('request');

export class SocketRequester {
    /**
     * Request client that will be used.
     *
     * @type {any}
     */
    protected request: any;

    /**
     * Initialize the requester.
     *
     * @param {any} options
     */
    constructor(protected options) {
        this.request = request;
    }

    /**
     * Send a request to the server.
     *
     * @param  {string}  method
     * @param  {any}  socket
     * @param  {any}  options
     * @return {Promise<any>}
     */
    serverRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options = {
                ...options,
                ...{
                    headers: this.prepareHeaders(socket, options),
                },
            };

            this.request(options, (error, response, body, next) => {
                if (error) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        options,
                        action: 'auth',
                        status: 'failed',
                        error,
                    });

                    reject({ reason: 'Error sending authentication request.', status: 0 });
                } else if (response.statusCode !== 200) {
                    if (this.options.development) {
                        Log.warning({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
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
                            socketId: socket ? socket.id : null,
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
        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        if (socket) {
            options.headers['X-Forwarded-For'] = socket.request.headers['x-forwarded-for'] || socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

            let userAgent = socket.request.headers['user-agent'] || socket.handshake.headers['user-agent'];
            let cookie = options.headers['Cookie'] || socket.request.headers.cookie || socket.handshake.headers.cookie;

            if (userAgent) {
                options.headers['User-Agent'] = userAgent;
            }

            if (cookie) {
                options.headers['Cookie'] = cookie;
            }
        }

        return options.headers;
    }
}

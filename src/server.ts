var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var url = require('url');
var io = require('socket.io');
import { Log } from './log';

export class Server {
    /**
     * The http server.
     *
     * @type {any}
     */
    public express: any;

    /**
     * Socket.io client.
     *
     * @type {object}
     */
    public io: any;

    /**
     * Create a new server instance.
     *
     * @param {any} options
     */
    constructor(private options) {
        //
    }

    /**
     * Start the Socket.io server.
     *
     * @return {Promise<any>}
     */
    init(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.serverProtocol().then(() => {
                let host = this.options.host || '127.0.0.1';
                Log.success(`Running at ${host} on port ${this.getPort()}`);

                resolve(this.io);
            }, error => reject(error));
        });
    }

    /**
     * Sanitize the port number from any extra characters
     *
     * @return {number}
     */
    getPort() {
        let portRegex = /([0-9]{2,5})[\/]?$/;
        let portToUse = String(this.options.port).match(portRegex); // index 1 contains the cleaned port number only
        return Number(portToUse[1]);
    }

    /**
     * Select the http protocol to run on.
     *
     * @return {Promise<any>}
     */
    serverProtocol(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.options.protocol == 'https') {
                this.secure().then(() => {
                    resolve(this.httpServer(true));
                }, error => reject(error));
            } else {
                resolve(this.httpServer(false));
            }
        });
    }

    /**
     * Load SSL 'key' & 'cert' files if https is enabled.
     *
     * @return {Promise<any>}
     */
    secure(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.options.ssl.certPath || !this.options.ssl.keyPath) {
                reject('SSL paths are missing in server config.');
            }

            Object.assign(this.options, {
                cert: fs.readFileSync(this.options.ssl.certPath),
                key: fs.readFileSync(this.options.ssl.KeyPath),
                ca: (this.options.ssl.caPath) ? fs.readFileSync(this.options.ssl.caPath) : '',
                passphrase: this.options.ssl.passphrase,
            });

            resolve(this.options);
        });
    }

    /**
     * Create a socket.io server.
     *
     * @param  {boolean}  secure
     * @return {any}
     */
    httpServer(secure: boolean) {
        this.express = express();
        this.express.use((req, res, next) => {
            for (var header in this.options.headers) {
                res.setHeader(header, this.options.headers[header]);
            }
            next();
        });

        if (secure) {
            var httpServer = https.createServer(this.options, this.express);
        } else {
            var httpServer = http.createServer(this.express);
        }

        httpServer.listen(this.getPort(), this.options.host);

        this.authorizeRequests();

        return this.io = io(httpServer, this.options.socketIoOptions);
    }

    /**
     * Attach global protection to HTTP routes, to verify the API key.
     */
    authorizeRequests(): void {
        this.express.param('appId', (req, res, next) => {
            if (!this.canAccess(req)) {
                return this.unauthorizedResponse(req, res);
            }

            next();
        });
    }

    /**
     * Check is an incoming request can access the api.
     *
     * @param  {any}  req
     * @return {boolean}
     */
    canAccess(req: any): boolean {
        let appId = this.getAppId(req);
        let key = this.getAuthKey(req);

        if (key && appId) {
            let client = this.options.clients.find((client) => {
                return client.appId === appId;
            });

            if (client) {
                return client.key === key;
            }
        }

        return false;
    }

    /**
     * Get the appId from the URL
     *
     * @param  {any}  req
     * @return {string|boolean}
     */
    getAppId(req: any): (string | boolean) {
        if (req.params.appId) {
            return req.params.appId;
        }

        return false;
    }

    /**
     * Get the api token from the request.
     *
     * @param  {any}  req
     * @return {string|boolean}
     */
    getAuthKey(req: any): (string | boolean) {
        if (req.headers.authorization) {
            return req.headers.authorization.replace('Bearer ', '');
        }

        if (url.parse(req.url, true).query.auth_key) {
            return url.parse(req.url, true).query.auth_key
        }

        return false;
    }

    /**
     * Handle unauthorized requests.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    unauthorizedResponse(req: any, res: any): boolean {
        res.statusCode = 403;
        res.json({ error: 'Unauthorized' });

        return false;
    }
}

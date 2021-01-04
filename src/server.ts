const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const url = require('url');
const io = require('socket.io');
const Redis = require('ioredis');
const redisAdapter = require('socket.io-redis');
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
     * Initialize the server.
     *
     * @return {Promise<any>}
     */
    initialize(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.serverProtocol().then(() => {
                let host = this.options.host || '127.0.0.1';
                Log.success(`Running at ${host} on port ${this.options.port}`);

                this.configureAdapters();

                resolve(this.io);
            }, error => reject(error));
        });
    }

    /**
     * Select the http protocol to run on.
     *
     * @return {Promise<any>}
     */
    serverProtocol(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.options.protocol === 'https') {
                this.configureSecurity().then(() => {
                    resolve(this.buildServer(true));
                }, error => reject(error));
            } else {
                resolve(this.buildServer(false));
            }
        });
    }

    /**
     * Load SSL 'key' & 'cert' files if https is enabled.
     *
     * @return {Promise<any>}
     */
    configureSecurity(): Promise<any> {
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
     * Create Socket.IO & HTTP(S) servers.
     *
     * @param  {boolean}  secure
     * @return {any}
     */
    buildServer(secure: boolean) {
        this.express = express();
        this.express.use((req, res, next) => {
            for (let header in this.options.headers) {
                res.setHeader(header, this.options.headers[header]);
            }

            next();
        });

        let httpServer = secure
            ? https.createServer(this.options, this.express)
            : http.createServer(this.express);

        httpServer.listen(this.options.port, this.options.host);

        this.authorizeRequests();

        this.options.socketIoOptions = {
            ...this.options.socketIoOptions,
            ...{
                cors: this.options.cors,
            },
        };

        return this.io = io(httpServer, this.options.socketIoOptions);
    }

    /**
     * Configure the Socket.IO adapters.
     *
     * @return {void}
     */
    configureAdapters(): void {
        if (this.options.database.driver === 'redis') {
            let pubClient = new Redis(this.options.database.redis);
            let subClient = new Redis(this.options.database.redis);

            this.io.adapter(redisAdapter({
                key: 'redis-adapter',
                pubClient: pubClient,
                subClient: subClient,
            }));
        }
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

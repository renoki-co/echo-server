import { Log } from './log';

const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const Redis = require('ioredis');
const io = require('socket.io');
const redisAdapter = require('socket.io-redis');

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
    constructor(protected options) {
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
                this.configureSocketIdGeneration();

                resolve(this.io);
            }, error => reject(error));
        });
    }

    /**
     * Select the http protocol to run on.
     *
     * @return {Promise<any>}
     */
    protected serverProtocol(): Promise<any> {
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
    protected configureSecurity(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.options.ssl.certPath || !this.options.ssl.keyPath) {
                reject('SSL paths are missing in server config.');
            }

            Object.assign(this.options, {
                cert: fs.readFileSync(this.options.ssl.certPath),
                key: fs.readFileSync(this.options.ssl.keyPath),
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
    protected buildServer(secure: boolean) {
        this.express = express();

        this.configureHeaders();
        this.configureJsonBody();

        let httpServer = secure
            ? https.createServer(this.options, this.express)
            : http.createServer(this.express);

        httpServer.listen(this.options.port, this.options.host);

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
    protected configureAdapters(): void {
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
     * Configure the Socket.IO ID generation.
     *
     * @return {void}
     */
    protected configureSocketIdGeneration(): void {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        this.io.engine.generateId = req => randomNumber(min, max) + '.' + randomNumber(min, max);
    }

    /**
     * Configure the headers from the settings.
     *
     * @return {void}
     */
    protected configureHeaders(): void {
        this.express.use((req, res, next) => {
            for (let header in this.options.headers) {
                res.setHeader(header, this.options.headers[header]);
            }

            next();
        });
    }

    /**
     * Configure the JSON body parser.
     *
     * @return {void}
     */
    protected configureJsonBody(): void {
        this.express.use(bodyParser.json({
            strict: true,
            verify: (req, res, buffer) => {
                req.rawBody = buffer.toString();
            },
        }));
    }
}

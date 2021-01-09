import { AppManager } from './app-managers/app-manager';
import { Channel } from './channels';
import { HttpApi } from './api';
import { HttpSubscriber, RedisSubscriber, Subscriber } from './subscribers';
import { Log } from './log';
import { Server } from './server';

const packageFile = require('../package.json');
const { constants } = require('crypto');

/**
 * Echo server class.
 */
export class EchoServer {
    /**
     * Default server options.
     *
     * @type {any}
     */
    public options: any = {
        appManager: {
            driver: 'array',
            api: {
                host: 'http://127.0.0.1',
                endpoint: '/echo-server/app',
            },
            array: {
                apps: [
                    {
                        id: 'echo-app',
                        key: 'echo-app-key',
                        secret: 'echo-app-secret',
                    },
                ],
            },
        },
        auth: {
            host: 'http://127.0.0.1',
            endpoint: '/broadcasting/auth',
        },
        cors: {
            credentials: true,
            origin: ['http://127.0.0.1'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: [
                'Origin',
                'Content-Type',
                'X-Auth-Token',
                'X-Requested-With',
                'Accept',
                'Authorization',
                'X-CSRF-TOKEN',
                'XSRF-TOKEN',
                'X-Socket-Id',
            ],
        },
        database: {
            driver: 'redis',
            redis: {
                host: '127.0.0.1',
                port: 6379,
                password: null,
                publishPresence: true,
                keyPrefix: '',
            },
        },
        development: false,
        host: null,
        headers: [
            //
        ],
        port: 6001,
        protocol: 'http',
        secureOptions: constants.SSL_OP_NO_TLSv1,
        socketIoOptions: {
            //
        },
        ssl: {
            certPath: '',
            keyPath: '',
            caPath: '',
            passphrase: '',
        },
        subscribers: {
            http: true,
            redis: true,
        },
    };

    /**
     * Socket.io server instance.
     *
     * @type {Server}
     */
    private server: Server;

    /**
     * Channel instance.
     *
     * @type {Channel}
     */
    private channel: Channel;

    /**
     * The subscribers list.
     *
     * @type {Subscriber[]}
     */
    private subscribers: Subscriber[];

    /**
     * The HTTP API instance.
     *
     * @type {HttpApi}
     */
    private httpApi: HttpApi;

    /**
     * The app manager used for client authentication.
     *
     * @type {AppManager}
     */
    protected _appManager;

    /**
     * Create a new Echo Server instance.
     *
     * @return {void}
     */
    constructor() {
        this._appManager = new AppManager(this.options);
    }

    /**
     * Start the Echo Server.
     *
     * @param  {any}  options
     * @return {Promise<any>}
     */
    run(options: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.options = Object.assign(this.options, options);
            this.server = new Server(this.options);

            Log.title(`Echo Server v${packageFile.version}\n`);

            if (this.options.development) {
                Log.warning('Starting the server in development mode...\n');
            } else {
                Log.info('Starting the server...\n')
            }

            this.server.initialize().then(io => {
                this.initialize(io).then(() => {
                    Log.info('\nServer ready!\n');

                    if (this.options.development) {
                        Log.info({ options: this.options });
                    }

                    resolve(this);
                }, error => Log.error(error));
            }, error => Log.error(error));
        });
    }

    /**
     * Initialize the websockets server.
     *
     * @param  {any}  io
     * @return {Promise<void>}
     */
    initialize(io: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.channel = new Channel(io, this.options);
            this.subscribers = [];

            if (this.options.subscribers.http) {
                this.subscribers.push(new HttpSubscriber(this.server.express, this.options));
            }

            if (this.options.subscribers.redis) {
                this.subscribers.push(new RedisSubscriber(this.options));
            }

            this.httpApi = new HttpApi(io, this.channel, this.server.express, this.options.cors);

            this.httpApi.initialize();

            this.registerConnectionCallbacks();

            this.listen().then(() => resolve(), err => Log.error(err));
        });
    }

    /**
     * Stop the echo server.
     *
     * @return {Promise<any>}
     */
    stop(): Promise<any> {
        console.log('Stopping the server...');

        let promises = [];

        this.subscribers.forEach(subscriber => {
            promises.push(subscriber.unsubscribe());
        });

        promises.push(this.server.io.close());

        return Promise.all(promises).then(() => {
            this.subscribers = [];
            console.log('The Echo server has been stopped.');
        });
    }

    /**
     * Listen for incoming event from subscibers.
     *
     * @return {Promise<void>}
     */
    listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            let subscribePromises = this.subscribers.map(subscriber => {
                return subscriber.subscribe((channel, message) => {
                    return this.broadcast(channel, message);
                });
            });

            Promise.all(subscribePromises).then(() => resolve());
        });
    }

    /**
     * Return a channel by its socket id.
     *
     * @param  {string}  socketId
     * @return {any}
     */
    find(socketId: string): any {
        // TODO: Fix adapter
        // TODO: Laravel should pass the app id to know on which NS to publish.
        return this.server.io.of(/.*/).sockets.sockets.get(socketId);
    }

    /**
     * Get the App ID from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|number|undefined}
     */
    getAppId(socket: any): string|number|undefined {
        return socket.handshake.query.appId;
    }

    /**
     * Broadcast events to channels from subscribers.
     *
     * @param  {string}  channel
     * @param  {any}  message
     * @return {boolean}
     */
    broadcast(channel: string, message: any): boolean {
        return (message.socket && this.find(message.socket))
            ? this.toOthers(this.find(message.socket), channel, message)
            : this.toAll(channel, message);
    }

    /**
     * Broadcast to others on channel.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  message
     * @return {boolean}
     */
    toOthers(socket: any, channel: string, message: any): boolean {
        socket.broadcast.to(channel).emit(message.event, channel, message.data);

        return true;
    }

    /**
     * Broadcast to all members on channel.
     *
     * @param  {string}  channel
     * @param  {any}  message
     * @return {boolean}
     */
    toAll(channel: string, message: any): boolean {
        // TODO: Laravel should send the NS to broadcast to.
        this.server.io.of(/.*/).to(channel).emit(message.event, channel, message.data);

        return true;
    }

    /**
     * Register callbacks for on('connection') events.
     *
     * @return {void}
     */
    registerConnectionCallbacks(): void {
        this.server.io.of(/.*/).on('connection', socket => {
            this.onSubscribe(socket);
            this.onUnsubscribe(socket);
            this.onDisconnecting(socket);
            this.onClientEvent(socket);
        });
    }

    /**
     * Handle subscriptions to a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    onSubscribe(socket: any): void {
        socket.on('subscribe', data => {
            let appId = this.getAppId(socket);

            if (! appId || ! this._appManager.find(appId)) {
                return socket.disconnect();
            }

            this.channel.join(socket, data);
        });
    }

    /**
     * Handle unsubscribes from a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', data => {
            this.channel.leave(socket, data.channel, 'unsubscribed');
        });
    }

    /**
     * Handle socket disconnection.
     *
     * @param  {any}  socket
     * @return {void}
     */
    onDisconnecting(socket: any): void {
        socket.on('disconnecting', (reason) => {
            socket.rooms.forEach(room => {
                // Each socket has a list of channels defined by us and his own channel
                // that has the same name as their unique socket ID. We don't want it to
                // be disconnected from that one and instead disconnect it from our defined channels.
                if (room !== socket.id) {
                    this.channel.leave(socket, room, reason);
                }
            });
        });
    }

    /**
     * Handle client events.
     *
     * @param  {any}  socket
     * @return {void}
     */
    onClientEvent(socket: any): void {
        socket.on('client event', data => {
            this.channel.clientEvent(socket, data);
        });
    }
}

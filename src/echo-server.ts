import { HttpSubscriber, RedisSubscriber, Subscriber } from './subscribers';
import { Channel } from './channels';
import { Server } from './server';
import { HttpApi } from './api';
import { Log } from './log';
import * as fs from 'fs';
const packageFile = require('../package.json');
const { constants } = require('crypto');

/**
 * Echo server class.
 */
export class EchoServer {
    /**
     * Default server options.
     */
    public options: any = {
        auth: {
            host: 'http://127.0.0.1',
            endpoint: '/broadcasting/auth',
        },
        cors: {
            credentials: false,
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
                publishPresence: true,
                keyPrefix: 'echo-server',
            },
            sqlite: {
                path: '/database/laravel-echo-server.sqlite'
            },
        },
        development: false,
        host: null,
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
     */
    private server: Server;

    /**
     * Channel instance.
     */
    private channel: Channel;

    /**
     * Subscribers
     */
    private subscribers: Subscriber[];

    /**
     * Http api instance.
     */
    private httpApi: HttpApi;

    /**
     * Create a new instance.
     */
    constructor() {
        //
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
            this.startup();
            this.server = new Server(this.options);

            this.server.init().then(io => {
                this.init(io).then(() => {
                    Log.info('\nServer ready!\n');

                    if (this.options.development) {
                        Log.info(`Current options:\n`);
                        console.log(this.options);
                    }

                    resolve(this);
                }, error => Log.error(error));
            }, error => Log.error(error));
        });
    }

    /**
     * Initialize the class
     *
     * @param  {any}  io
     * @return {Promise<void>}
     */
    init(io: any): Promise<void> {
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
            this.httpApi.init();

            this.onConnect();

            this.listen().then(() => resolve(), err => Log.error(err));
        });
    }

    /**
     * Text shown at startup.
     */
    startup(): void {
        Log.title(`\Echo Server v${packageFile.version} \n`);

        if (this.options.development) {
            Log.warning('Starting the server in development mode...\n');
        } else {
            Log.info('Starting the server...\n')
        }
    }

    /**
     * Stop the echo server.
     *
     * @return {Promise<any>}
     */
    stop(): Promise<any> {
        console.log('Stopping the server...')

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
        return this.server.io.sockets.connected[socketId];
    }

    /**
     * Broadcast events to channels from subscribers.
     *
     * @param  {string}  channel
     * @param  {any}  message
     * @return {boolean}
     */
    broadcast(channel: string, message: any): boolean {
        if (message.socket && this.find(message.socket)) {
            return this.toOthers(this.find(message.socket), channel, message);
        } else {
            return this.toAll(channel, message);
        }
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

        return true
    }

    /**
     * Broadcast to all members on channel.
     *
     * @param  {string}  channel
     * @param  {any}  message
     */
    toAll(channel: string, message: any): boolean {
        this.server.io.to(channel).emit(message.event, channel, message.data);

        return true;
    }

    /**
     * On server connection.
     */
    onConnect(): void {
        this.server.io.on('connection', socket => {
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
            Object.keys(socket.rooms).forEach(room => {
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

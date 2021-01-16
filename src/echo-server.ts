import { AppManager } from './app-managers/app-manager';
import { Channel, PresenceChannel, PrivateChannel } from './channels';
import { HttpApi } from './api';
import { Log } from './log';
import { Server } from './server';

const { constants } = require('crypto');
const packageFile = require('../package.json');

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
                endpoint: '/echo-server/app/:appId',
                token: 'echo-app-token',
            },
            array: {
                apps: [
                    {
                        id: 'echo-app',
                        key: 'echo-app-key',
                        secret: 'echo-app-secret',
                        // maxConnections: 100,
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
    };

    /**
     * Socket.io server instance.
     *
     * @type {Server}
     */
    protected server: Server;

    /**
     * Public channel instance.
     *
     * @type {Channel}
     */
    protected publicChannel: Channel;

    /**
     * Private channel instance.
     *
     * @type {PrivateChannel}
     */
    protected privateChannel: PrivateChannel;

    /**
     * Presence channel instance.
     *
     * @type {PresenceChannel}
     */
    protected presenceChannel: PresenceChannel;

    /**
     * The HTTP API instance.
     *
     * @type {HttpApi}
     */
    protected httpApi: HttpApi;

    /**
     * The app manager used for client authentication.
     *
     * @type {AppManager}
     */
    protected appManager;

    /**
     * Create a new Echo Server instance.
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
    run(options: any = {}): Promise<any> {
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
                        Log.info({ options: JSON.stringify(this.options) });
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
            this.appManager = new AppManager(this.options);

            this.publicChannel = new Channel(io, this.options);
            this.privateChannel = new PrivateChannel(io, this.options);
            this.presenceChannel = new PresenceChannel(io, this.options);

            this.httpApi = new HttpApi(this, io, this.server.express, this.options, this.appManager);

            this.httpApi.initialize();

            this.registerConnectionCallbacks();

            resolve();
        });
    }

    /**
     * Stop the echo server.
     *
     * @return {void}
     */
    stop(): void {
        console.log('Stopping the server...');

        this.server.io.close();
    }

    /**
     * Extract the namespace from socket.
     *
     * @param  {any}  socket
     * @return string
     */
    getNspForSocket(socket: any) {
        return socket ? socket.nsp.name : '/';
    }

    /**
     * Get the App ID from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|undefined}
     */
    protected getAppId(socket: any): string|undefined {
        return this.getNspForSocket(socket).replace(/^\//g, ''); // remove the starting slash
    }

    /**
     * Register callbacks for on('connection') events.
     *
     * @return {void}
     */
    protected registerConnectionCallbacks(): void {
        let nsp = this.server.io.of(/.*/);

        nsp.use((socket, next) => {
            this.checkIfSocketHasValidEchoApp(socket).then(socket => {
                next();
            }, error => {
                socket.disconnect();
            });
        });

        nsp.on('connection', socket => {
            this.checkIfSocketReachedLimit(socket).then(socket => {
                this.onSubscribe(socket);
                this.onUnsubscribe(socket);
                this.onDisconnecting(socket);
                this.onClientEvent(socket);
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        action: 'max_connections_check',
                        status: 'failed',
                        error,
                    });
                }

                socket.disconnect();
            });
        });
    }

    /**
     * Handle subscriptions to a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onSubscribe(socket: any): void {
        socket.on('subscribe', data => {
            this.getChannelInstance(data.channel).join(socket, data);
        });
    }

    /**
     * Handle unsubscribes from a channel.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', data => {
            this.getChannelInstance(data.channel).leave(socket, data.channel, 'unsubscribed');
        });
    }

    /**
     * Handle socket disconnection.
     *
     * @param  {any}  socket
     * @return {void}
     */
    protected onDisconnecting(socket: any): void {
        socket.on('disconnecting', reason => {
            socket.rooms.forEach(room => {
                // Each socket has a list of channels defined by us and his own channel
                // that has the same name as their unique socket ID. We don't want it to
                // be disconnected from that one and instead disconnect it from our defined channels.
                if (room !== socket.id) {
                    this.getChannelInstance(room).leave(socket, room, reason);
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
    protected onClientEvent(socket: any): void {
        socket.on('client event', data => {
            this.getChannelInstance(data.channel).onClientEvent(socket, data);
        });
    }

    /**
     * Get the channel instance for a channel name.
     *
     * @param  {string}  channel
     * @return {Channel|PrivateChannel|PresenceChannel}
     */
    getChannelInstance(channel): Channel|PrivateChannel|PresenceChannel {
        if (Channel.isPresenceChannel(channel)) {
            return this.presenceChannel;
        } else if (Channel.isPrivateChannel(channel)) {
            return this.privateChannel;
        } else {
            return this.publicChannel;
        }
    }

    /**
     * Make sure if the socket connected
     * to a valid echo app.
     *
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected checkIfSocketHasValidEchoApp(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.echoApp) {
                return resolve(socket);
            }

            let appId = this.getAppId(socket);

            this.appManager.find(appId, socket, {}).then(app => {
                if (!app) {
                    reject({ reason: `The app ${appId} does not exist` });
                } else {
                    socket.echoApp = app;
                    resolve(socket);
                }
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        action: 'find_app',
                        status: 'failed',
                        error,
                    });
                }

                reject(error);
            });
        });
    }

    /**
     * Make sure the socket connection did not
     * reach the app limit.
     *
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected checkIfSocketReachedLimit(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.disconnected || !socket.echoApp) {
                return reject({ reason: 'The connection cannot check if reached the limit, because it was not authenticated.' });
            }

            this.server.io.of(this.getNspForSocket(socket)).allSockets().then(clients => {
                let maxConnections = parseInt(socket.echoApp.maxConnections) || -1;

                if (maxConnections < 0) {
                    return resolve(socket);
                }

                if (maxConnections >= clients.size) {
                    resolve(socket);
                } else {
                    reject({ reason: 'The current app reached connections limit.' });
                }
            }, error => Log.error(error));
        });
    }
}

import { AppManager } from './app-managers/app-manager';
import { Channel, PresenceChannel, PrivateChannel } from './channels';
import { HttpApi } from './api';
import { Log } from './log';
import { Server } from './server';
import { Stats } from './stats';

const { constants } = require('crypto');
const dayjs = require('dayjs');
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
                endpoint: '/echo-server/app',
                token: 'echo-app-token',
            },
            array: {
                apps: [
                    {
                        id: 'echo-app',
                        key: 'echo-app-key',
                        secret: 'echo-app-secret',
                        maxConnections: -1,
                        allowedOrigins: ['*'],
                        enableStats: false,
                    },
                ],
            },
        },
        cors: {
            credentials: true,
            origin: ['*'],
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
            local: {
                //
            },
        },
        development: false,
        host: null,
        headers: [
            //
        ],
        stats: {
            enabled: true,
            driver: 'local',
            'local-disk': {
                root: `${process.cwd()}/stats`,
            },
            snapshots: {
                interval: 60 * 60,
            },
            retention: {
                period: 7 * 24 * 60 * 60, // 7 days
            },
        },
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
     * Let the server know to reject any new connections.
     *
     * @type {boolean}
     */
    protected rejectNewConnections = false;

    /**
     * The stats manager that will be used to store stats.
     *
     * @type {Stats}
     */
    protected stats;

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
    start(options: any = {}): Promise<any> {
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
                    this.rejectNewConnections = false;

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
            this.stats = new Stats(this.options);

            this.publicChannel = new Channel(io, this.stats, this.options);
            this.privateChannel = new PrivateChannel(io, this.stats, this.options);
            this.presenceChannel = new PresenceChannel(io, this.stats, this.options);

            this.httpApi = new HttpApi(
                this,
                io,
                this.server.express,
                this.options,
                this.appManager,
                this.stats,
            );

            this.httpApi.initialize();

            let nsp = this.server.io.of(/.*/);

            this.registerSocketMiddleware(nsp);
            this.registerConnectionCallbacks(nsp);
            this.registerStatsSnapshotter();

            resolve();
        });
    }

    /**
     * Stop the echo server.
     *
     * @return {Promise<void>}
     */
    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('Stopping the server...');

            this.rejectNewConnections = true;

            this.server.io.close(() => resolve());
        });
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
     * Get the App Key from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|undefined}
     */
    protected getAppKey(socket: any): string|undefined {
        return this.getNspForSocket(socket).replace(/^\//g, ''); // remove the starting slash
    }

    /**
     * Register the Socket.IO middleware.
     *
     * @param  {any}  nsp
     * @return {void}
     */
    protected registerSocketMiddleware(nsp: any): void {
        nsp.use((socket, next) => {
            socket.id = this.generateSocketId();

            this.checkIfSocketHasValidEchoApp(socket).then(socket => {
                this.checkIfSocketOriginIsAllowed(socket).then(socket => {
                    next();
                }, error => {
                    if (this.options.development) {
                        Log.error({
                            time: new Date().toISOString(),
                            socketId: socket ? socket.id : null,
                            action: 'origin_check',
                            status: 'failed',
                            error,
                        });
                    }

                    next(error);
                });
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId: socket ? socket.id : null,
                        action: 'app_check',
                        status: 'failed',
                        error,
                    });
                }

                next(error);
            });
        });
    }

    /**
     * Register callbacks for on('connection') events.
     *
     * @param  {any}  nsp
     * @return {void}
     */
    protected registerConnectionCallbacks(nsp): void {
        nsp.on('connection', socket => {
            this.stats.markNewConnection(socket.echoApp);

            socket.on('disconnect', reason => {
                this.stats.markDisconnection(socket.echoApp);
            });

            if (this.rejectNewConnections) {
                return socket.disconnect();
            }

            this.checkIfSocketDidNotReachedLimit(socket).then(socket => {
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
     * Register the stats snapshotter for all namespaces.
     *
     * @return {void}
     */
    protected registerStatsSnapshotter(): void {
        if (this.options.stats.enabled) {
            setInterval(() => {
                let time = dayjs().unix();

                this.server.io._nsps.forEach((nsp, name) => {
                    if (name !== '/') {
                        if (this.options.development) {
                            Log.info({
                                time,
                                nsp: name,
                                action: 'taking_snapshot',
                            });
                        }

                        this.stats.takeSnapshot(name.replace(/^\//g, ''), time).then(() => {
                            this.stats.deleteStalePoints(name.replace(/^\//g, ''), time);
                        });
                    }
                });
            }, this.options.stats.snapshots.interval * 1000);
        }
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

            let appKey = this.getAppKey(socket);

            this.appManager.findByKey(appKey, socket, {}).then(app => {
                console.log({ socket });
                if (!app) {
                    reject({ reason: `The app ${appKey} does not exist` });
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
    protected checkIfSocketDidNotReachedLimit(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.disconnected || !socket.echoApp) {
                return reject({ reason: 'The app connection limit cannot be checked because the socket is not authenticated.' });
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
            }, error => {
                Log.error(error);
                reject(error);
            });
        });
    }

    /**
     * Check if the socket origin is allowed
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected checkIfSocketOriginIsAllowed(socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (socket.disconnected || !socket.echoApp) {
                return reject({ reason: 'The origin cannot be checked because the socket is not authenticated.' });
            }

            let originIsAllowed = false;
            let allowedOrigins = socket.echoApp.allowedOrigins || ['*'];
            let socketOrigin = socket.handshake.headers.origin || null;

            if (!socketOrigin) {
                return reject({ reason: 'The origin header is not existent' });
            }

            allowedOrigins.forEach(pattern => {
                // Make sure to prepend the Regex special characters with a backslash, so that
                // things from the origin like "/" or "." do not count as Regex characters.
                let regex = new RegExp(pattern.replace(/(\.|\||\+|\?|\$|\/|\\)/g, '\\$1').replace('*', '.*'));

                if (regex.test(socketOrigin)) {
                    originIsAllowed = true;
                }
            });

            if (originIsAllowed) {
                resolve(socket);
            } else {
                reject({ reason: `The origin ${socketOrigin} is not allowed.` });
            }
        });
    }

    /**
     * Generate a Pusher-like socket id.
     *
     * @return {string}
     */
    protected generateSocketId(): string {
        let min = 0;
        let max = 10000000000;

        let randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

        return randomNumber(min, max) + '.' + randomNumber(min, max);
    }
}

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
            this.publicChannel = new Channel(io, this.options);
            this.privateChannel = new PrivateChannel(io, this.options);
            this.presenceChannel = new PresenceChannel(io, this.options);

            this.httpApi = new HttpApi(this, io, this.server.express, this.options);

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
     * Get the App ID from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|number|undefined}
     */
    protected getAppId(socket: any): string|number|undefined {
        return socket.handshake.query.appId;
    }

    /**
     * Register callbacks for on('connection') events.
     *
     * @return {void}
     */
    protected registerConnectionCallbacks(): void {
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
    protected onSubscribe(socket: any): void {
        socket.on('subscribe', data => {
            let appId = this.getAppId(socket);

            if (!appId || !this._appManager.find(appId)) {
                return socket.disconnect();
            }

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
}

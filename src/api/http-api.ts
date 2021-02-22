import { Log } from './../log';
import { PresenceChannel } from './../channels/presence-channel';

const dayjs = require('dayjs');
const pusherUtil = require('pusher/lib/util');
const Pusher = require('pusher');
const url = require('url');

export class HttpApi {
    /**
     * Create new instance of HTTP API.
     *
     * @param {any} server
     * @param {any}  io
     * @param {any} express
     * @param {object} options
     * @param {any}  appManager
     * @param {any}  stats
     */
    constructor(
        protected server,
        protected io,
        protected express,
        protected options,
        protected appManager,
        protected stats,
    ) {
        //
    }

    /**
     * Initialize the HTTP API.
     *
     * @return {void}
     */
    initialize(): void {
        this.registerCorsMiddleware();
        this.configurePusherAuthentication();

        this.express.get('/', (req, res) => this.getRoot(req, res));
        this.express.get('/apps/:appId/channels', (req, res) => this.getChannels(req, res));
        this.express.get('/apps/:appId/channels/:channelName', (req, res) => this.getChannel(req, res));
        this.express.get('/apps/:appId/channels/:channelName/users', (req, res) => this.getChannelUsers(req, res));
        this.express.post('/apps/:appId/events', (req, res) => this.broadcastEvent(req, res));

        if (this.options.stats.enabled) {
            this.express.get('/apps/:appId/stats', (req, res) => this.getStats(req, res));
            this.express.get('/apps/:appId/stats/current', (req, res) => this.getCurrentStats(req, res));
        }
    }

    /**
     * Add CORS middleware if applicable.
     *
     * @return {void}
     */
    protected registerCorsMiddleware(): void {
        this.express.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', this.options.cors.origin.join(', '));
            res.header('Access-Control-Allow-Methods', this.options.cors.methods.join(', '));
            res.header('Access-Control-Allow-Headers', this.options.cors.allowedHeaders.join(', '));

            next();
        });
    }

    /**
     * Attach global protection to HTTP routes, to verify the API key.
     *
     * @return {void}
     */
    protected configurePusherAuthentication(): void {
        this.express.param('appId', (req, res, next) => {
            this.signatureIsValid(req).then(isValid => {
                if (!isValid) {
                    this.unauthorizedResponse(req, res);
                } else {
                    next()
                }
            });
        });
    }

    /**
     * Outputs a simple message to show that the server is running.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getRoot(req: any, res: any): void {
        res.send('OK');
    }

    /**
     * Get a list of the open channels on the server.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getChannels(req: any, res: any): void {
        let appKey = req.echoApp.key;
        let prefix = url.parse(req.url, true).query.filter_by_prefix;
        let rooms = this.io.of(`/${appKey}`).adapter.rooms;
        let channels = {};

        rooms.forEach((sockets, channelName) => {
            if (sockets.size === 0) {
                return;
            }

            if (prefix && !channelName.startsWith(prefix)) {
                return;
            }

            channels[channelName] = {
                subscription_count: sockets.size,
                occupied: true
            };
        }, []);

        res.json({ channels: channels });
    }

    /**
     * Get a information about a channel.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    protected getChannel(req: any, res: any): void {
        let appKey = req.echoApp.key;
        let channelName = req.params.channelName;
        let room = this.io.of(`/${appKey}`).adapter.rooms.get(channelName);
        let subscriptionCount = room ? room.size : 0;
        let channel = this.server.getChannelInstance(channelName);

        let result = {
            subscription_count: subscriptionCount,
            occupied: !!subscriptionCount
        };

        if (channel instanceof PresenceChannel) {
            channel.getMembers(`/${appKey}`, channelName).then(members => {
                members = members || [];

                res.json({
                    ...result,
                    ...{
                        user_count: members.reduce((map, member) => map.set(member.user_id, member), new Map).size
                    },
                });
            });
        } else {
            res.json({ result });
        }
    }

    /**
     * Get the users of a channel.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected getChannelUsers(req: any, res: any): boolean {
        let appKey = req.echoApp.key;
        let channelName = req.params.channelName;
        let channel = this.server.getChannelInstance(channelName);

        if (!(channel instanceof PresenceChannel)) {
            return this.badResponse(
                req,
                res,
                'User list is only possible for Presence Channels'
            );
        }

        channel.getMembers(`/${appKey}`, channelName).then(members => {
            members = members || [];

            res.json({
                users: [...members.reduce((map, member) => map.set(member), new Map)][0].filter(user => !!user),
            });
        }, error => Log.error(error));
    }

    /**
     * Broadcast an event.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected broadcastEvent(req: any, res: any): boolean {
        if (
            (!req.body.channels && !req.body.channel) ||
            !req.body.name ||
            !req.body.data
        ) {
            return this.badResponse(req, res, 'Wrong format.');
        }

        let appKey = req.echoApp.key;
        let socketId = req.body.socket_id || null;

        if (socketId) {
            this.findSocketInNamespace(`/${appKey}`, socketId).then(socket => {
                this.sendEventToChannels(`/${appKey}`, req, socket);
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        socketId,
                        action: 'socket_find',
                        status: 'failed',
                        error,
                    });
                }
            });
        } else {
            this.sendEventToChannels(`/${appKey}`, req);
        }

        res.json({ message: 'ok' });

        return true;
    }

    /**
     * Retrieve the statistics for a given app.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected getStats(req, res): boolean {
        let start = req.query.start || dayjs().subtract(7, 'day').unix();
        let end = req.query.end || dayjs().unix();

        this.stats.getSnapshots(req.echoApp, start, end).then(snapshots => {
            res.json({ stats: snapshots });
        });

        return true;
    }

    /**
     * Retrieve the current statistics for a given app.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected getCurrentStats(req, res): boolean {
        this.stats.getStats(req.echoApp).then(stats => {
            res.json({ stats });
        });

        return true;
    }

    /**
     * Find a Socket by Id in a given namespace.
     *
     * @param  {string}  namespace
     * @param  {string}  socketId
     * @return {Promise<any>}
     */
    protected findSocketInNamespace(namespace: string, socketId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            let socket = this.io.of(namespace).sockets.get(socketId);

            if (socket) {
                resolve(socket);
            } else {
                reject({ reason: `The socket ${socketId} does not exist.`});
            }
        });
    }

    /**
     * Send the events from the request to given namespace,
     * with the broadcasting of a socket (if any).
     *
     * @param  {string}  namespace
     * @param  {any}  req
     * @param  {any}  socket
     * @return {void}
     */
    protected sendEventToChannels(namespace: string, req: any, socket: any = null): void
    {
        let channels = req.body.channels || [req.body.channel];

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socket: socket ? socket : null,
                action: 'sendEvent',
                status: 'success',
                namespace,
                channels,
                body: req.body,
                params: req.params,
                query: req.query,
            });
        }

        channels.forEach(channel => {
            if (socket) {
                socket.broadcast
                    .to(channel)
                    .emit(req.body.name, channel, req.body.data);
            } else {
                this.io.of(namespace)
                    .to(channel)
                    .emit(req.body.name, channel, req.body.data);
            }

            this.stats.markApiMessage(req.echoApp);
        });
    }

    /**
     * Get the app ID from the URL.
     *
     * @param  {any}  req
     * @return {string|null}
     */
    protected getAppId(req: any): string|null {
        return req.params.appId ? req.params.appId : null;
    }

    /**
     * Check is an incoming request can access the api.
     *
     * @param  {any}  req
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(req: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getSignedToken(req).then(token => {
                resolve(token === req.query.auth_signature);
            });
        });
    }

    /**
     * Get the signed token from the given request.
     *
     * @param  {any}  req
     * @return {Promise<string>}
     */
    protected getSignedToken(req: any): Promise<string> {
        return new Promise((resolve, reject) => {
            let socketData = {
                auth: {
                    headers: req.headers,
                },
            };

            this.appManager.findById(this.getAppId(req), null, socketData).then(app => {
                if (!app) {
                    reject({ reason: 'App not found when signing token.' });
                }

                req.echoApp = app;

                let key = req.query.auth_key;
                let token = new Pusher.Token(key, app.secret);

                const params = {
                    auth_key: app.key,
                    auth_timestamp: req.query.auth_timestamp,
                    auth_version: req.query.auth_version,
                    ...req.query,
                    ...req.params,
                };

                delete params['auth_signature'];
                delete params['body_md5']
                delete params['appId'];
                delete params['appKey'];
                delete params['channelName'];

                if (req.rawBody && Object.keys(req.body).length > 0) {
                    params['body_md5'] = pusherUtil.getMD5(req.rawBody);
                }

                resolve(
                    token.sign([
                        req.method.toUpperCase(),
                        req.path,
                        pusherUtil.toOrderedArray(params).join('&'),
                    ].join("\n"))
                );
            }, error => {
                if (this.options.development) {
                    Log.error({
                        time: new Date().toISOString(),
                        action: 'find_app',
                        status: 'failed',
                        error,
                    });
                }
            });
        });
    }

    /**
     * Handle bad requests.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @param  {string}  message
     * @return {boolean}
     */
    protected badResponse(req: any, res: any, message: string): boolean {
        res.statusCode = 400;
        res.json({ error: message });

        return false;
    }

    /**
     * Handle unauthorized requests.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {boolean}
     */
    protected unauthorizedResponse(req: any, res: any): boolean {
        if (this.options.development) {
            Log.error({
                time: new Date().toISOString(),
                action: 'pusher_auth',
                status: 'failed',
                params: req.params,
                query: req.query,
                body: req.body,
                givenToken: req.query.auth_signature,
            });
        }

        res.statusCode = 403;
        res.json({ error: 'Unauthorized' });

        return false;
    }
}

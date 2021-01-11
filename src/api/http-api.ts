import { Log } from './../log';
import { PresenceChannel } from './../channels/presence-channel';

const url = require('url');

export class HttpApi {
    /**
     * Create new instance of HTTP API.
     *
     * @param {any} server
     * @param {any} express
     * @param {object} options
     */
    constructor(protected server, protected express, protected options) {
        //
    }

    /**
     * Initialize the HTTP API.
     */
    initialize(): void {
        this.corsMiddleware();

        this.express.get('/', (req, res) => this.getRoot(req, res));
        this.express.get('/apps/:appId/channels', (req, res) => this.getChannels(req, res));
        this.express.get('/apps/:appId/channels/:channelName', (req, res) => this.getChannel(req, res));
        this.express.get('/apps/:appId/channels/:channelName/users', (req, res) => this.getChannelUsers(req, res));
        this.express.post('/apps/:appId/events', (req, res) => this.broadcastEvent(req, res));
    }

    /**
     * Add CORS middleware if applicable.
     *
     * @return {void}
     */
    corsMiddleware(): void {
        this.express.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', this.options.origin.join(', '));
            res.header('Access-Control-Allow-Methods', this.options.methods.join(', '));
            res.header('Access-Control-Allow-Headers', this.options.allowedHeaders.join(', '));

            next();
        });
    }

    /**
     * Outputs a simple message to show that the server is running.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    getRoot(req: any, res: any): void {
        res.send('OK');
    }

    /**
     * Get a list of the open channels on the server.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @return {void}
     */
    getChannels(req: any, res: any): void {
        let appId = this.getAppId(req);
        let prefix = url.parse(req.url, true).query.filter_by_prefix;
        let rooms = this.server.io.of(`/${appId}`).adapter.rooms;
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
    getChannel(req: any, res: any): void {
        let appId = this.getAppId(req);
        let channelName = req.params.channelName;
        let room = this.server.io.of(`/${appId}`).adapter.rooms.get(channelName);
        let subscriptionCount = room ? room.size : 0;
        let channel = this.server.getChannelInstance(channelName);

        let result = {
            subscription_count: subscriptionCount,
            occupied: !!subscriptionCount
        };

        if (channel instanceof PresenceChannel) {
            channel.getMembers(channelName).then(members => {
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
    getChannelUsers(req: any, res: any): boolean {
        let channelName = req.params.channelName;
        let channel = this.server.getChannelInstance(channelName);

        if (!(channel instanceof PresenceChannel)) {
            return this.badResponse(
                req,
                res,
                'User list is only possible for Presence Channels'
            );
        }

        channel.getMembers(channelName).then(members => {
            res.json({
                users: [...members.reduce((map, member) => map.set(member), new Map)][0],
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
    broadcastEvent(req: any, res: any): boolean {
        if (
            (!!req.body.channels && !!req.body.channel) ||
            !!req.body.name ||
            !!req.body.data
        ) {
            return this.badResponse(req, res, 'Wrong format.');
        }

        let appId = this.getAppId(req);
        let channels = req.body.channels || [req.body.channel];

        channels.forEach(channel => {
            this.server.io.of(`/${appId}`)
                .to(channel)
                .emit(req.body.name, channel, req.body.data);
        });

        res.json({ message: 'ok' });

        return true;
    }

    /**
     * Handle bad requests.
     *
     * @param  {any}  req
     * @param  {any}  res
     * @param  {string}  message
     * @return {boolean}
     */
    badResponse(req: any, res: any, message: string): boolean {
        res.statusCode = 400;
        res.json({ error: message });

        return false;
    }

    /**
     * Get the app ID from the URL.
     *
     * @param  {any}  req
     * @return {string|null}
     */
    getAppId(req: any): string|null {
        return req.params.appId ? req.params.appId : null;
    }
}

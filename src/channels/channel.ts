import { PresenceChannel } from './presence-channel';
import { PrivateChannel } from './private-channel';
import { Log } from './../log';

export class Channel {
    /**
     * Channels and patters for private channels.
     */
    protected _privateChannels: string[] = ['private-*', 'presence-*'];

    /**
     * Allowed client events
     */
    protected _clientEvents: string[] = ['client-*'];

    /**
     * Private channel instance.
     */
    private: PrivateChannel;

    /**
     * Presence channel instance.
     */
    presence: PresenceChannel;

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} options
     */
    constructor(private io, private options) {
        this.private = new PrivateChannel(options);
        this.presence = new PresenceChannel(io, options);

        if (this.options.development) {
            Log.success('Channels are ready.');
        }
    }

    /**
     * Join a channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {void}
     */
    join(socket, data): void {
        if (data.channel) {
            if (this.isPrivate(data.channel)) {
                this.joinPrivate(socket, data);
            } else {
                socket.join(data.channel);
                this.onJoin(socket, data.channel);
            }
        }
    }

    /**
     * Trigger a client message.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {void}
     */
    clientEvent(socket, data): void {
        let appId = this.getAppId(socket);

        try {
            data = JSON.parse(data);
        } catch (e) {
            //
        }

        if (data.event && data.channel) {
            if (
                this.isClientEvent(data.event) &&
                this.isPrivate(data.channel) &&
                this.isInChannel(socket, data.channel)
            ) {
                this.io.of(`/${appId}`).sockets.connected.get(socket.id)
                    .broadcast.to(data.channel)
                    .emit(data.event, data.channel, data.data);
            }
        }
    }

    /**
     * Leave a channel.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {string}  reason
     * @return {void}
     */
    leave(socket: any, channel: string, reason: string): void {
        if (channel) {
            if (this.isPresence(channel)) {
                this.presence.leave(socket, channel)
            }

            socket.leave(channel);

            if (this.options.development) {
                Log.info({
                    time: new Date().toISOString(),
                    socketId: socket.id,
                    action: 'leave',
                    channel,
                    reason,
                });
            }
        }
    }

    /**
     * Check if the incoming socket connection is a private channel.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    isPrivate(channel: string): boolean {
        let isPrivate = false;

        this._privateChannels.forEach(privateChannel => {
            let regex = new RegExp(privateChannel.replace('*', '.*'));
            if (regex.test(channel)) isPrivate = true;
        });

        return isPrivate;
    }

    /**
     * Join private channel, emit data to presence channels.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {void}
     */
    joinPrivate(socket: any, data: any): void {
        let appId = this.getAppId(socket);

        this.private.authenticate(socket, data).then(res => {
            socket.join(data.channel);

            if (this.isPresence(data.channel)) {
                let member = res.channel_data;
                try {
                    member = JSON.parse(res.channel_data);
                } catch (e) {
                    //
                }

                this.presence.join(socket, data.channel, member);
            }

            this.onJoin(socket, data.channel);
        }, error => {
            if (this.options.development) {
                Log.error(error.reason);
            }

            this.io.of(`/${appId}`).sockets.to(socket.id)
                .emit('subscription_error', data.channel, error.status);
        });
    }

    /**
     * Check if a channel is a presence channel.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    isPresence(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * On join a channel log success.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {void}
     */
    onJoin(socket: any, channel: string): void {
        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socketId: socket.id,
                action: 'onJoin',
                channel,
            });
        }
    }

    /**
     * Check if client is a client event.
     *
     * @param  {string}  event
     * @return {boolean}
     */
    isClientEvent(event: string): boolean {
        let isClientEvent = false;

        this._clientEvents.forEach(clientEvent => {
            let regex = new RegExp(clientEvent.replace('*', '.*'));
            if (regex.test(event)) isClientEvent = true;
        });

        return isClientEvent;
    }

    /**
     * Check if a socket has joined a channel.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {boolean}
     */
    isInChannel(socket: any, channel: string): boolean {
        return !!socket.rooms[channel];
    }

    /**
     * Get the App ID from the socket connection.
     *
     * @param  {any}  socket
     * @return {string|number|undefined}
     */
    getAppId(socket: any): string|number|undefined {
        return socket.request.headers['X-App-Id'];
    }
}

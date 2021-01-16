import { Log } from './../log';

export class Channel {
    /**
     * Allowed client events patterns.
     *
     * @type {string[]}
     */
    protected _clientEventPatterns: string[] = [
        'client-*',
    ];

    /**
     * Channels and patters for private channels.
     *
     * @type {string[]}
     */
    protected static _privateChannelPatterns: string[] = [
        'private-*',
        'presence-*',
    ];

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} options
     */
    constructor(protected io, protected options) {
        //
    }

    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: any, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            socket.join(data.channel);
            this.onJoin(socket, data.channel, null);

            resolve({ socket, data });
        });
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
     * Handle joins.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onJoin(socket: any, channel: string, member: any): void {
        socket.emit('channel:joined', channel);

        if (this.options.development) {
            Log.info({
                time: new Date().toISOString(),
                socketId: socket.id,
                action: 'onJoin',
                member,
                channel,
            });
        }
    }

    /**
     * Trigger a client message.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {void}
     */
    onClientEvent(socket: any, data: any): void {
        try {
            data = JSON.parse(data);
        } catch (e) {
            //
        }

        Log.info({
            time: new Date().toISOString(),
            socketId: socket.id,
            action: 'client event',
            status: 'received',
            data,
        });

        if (data.event && data.channel) {
            if (
                this.isClientEvent(data.event) &&
                this.isInChannel(socket, data.channel)
            ) {
                this.io.of(this.getNspForSocket(socket))
                    .sockets
                    .get(socket.id)
                    .broadcast
                    .to(data.channel)
                    .emit(data.event, data.channel, data.data);

                Log.info({
                    time: new Date().toISOString(),
                    socketId: socket.id,
                    action: 'client event',
                    status: 'success',
                    data,
                });
            }
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

        this._clientEventPatterns.forEach(pattern => {
            let regex = new RegExp(pattern.replace('*', '.*'));

            if (regex.test(event)) {
                isClientEvent = true;
            }
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
        return socket.adapter.rooms.has(channel);
    }

    /**
     * Create alias for static.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {boolean}
     */
    static isInChannel(socket: any, channel: string): boolean {
        return this.isInChannel(socket, channel);
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
     * Create alias for static.
     *
     * @param  {any}  socket
     * @return string
     */
    static getNspForSocket(socket: any) {
        return this.getNspForSocket(socket);
    }

    /**
     * Check if the given channel name is private.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    static isPrivateChannel(channel): boolean {
        let isPrivate = false;

        this._privateChannelPatterns.forEach(pattern => {
            let regex = new RegExp(pattern.replace('*', '.*'));

            if (regex.test(channel)) {
                isPrivate = true;
            }
        });

        return isPrivate;
    }

    /**
     * Check if the given channel name is a presence channel.
     *
     * @param  {string}  channel
     * @return {boolean}
     */
    static isPresenceChannel(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }
}

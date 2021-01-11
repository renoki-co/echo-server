import { Database } from './../database';
import { Log } from './../log';
import { PrivateChannel } from './private-channel';

export class PresenceChannel extends PrivateChannel {
    /**
     * Database instance.
     */
    db: Database;

    /**
     * Create a new channel instance.
     *
     * @param {any} io
     * @param {any} options
     */
    constructor(protected io, protected options) {
        super(io, options);

        this.db = new Database(options);
    }

    /**
     * Remove inactive channel members from the presence channel.
     *
     * @param  {string}  channel
     * @param  {any[]}  members
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    protected removeInactive(channel: string, members: any[], socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.io.of(this.getNspForSocket(socket)).in(channel).allSockets().then(clients => {
                members = members || [];
                members = members.filter(member => {
                    return clients.has(member.socketId);
                });

                this.db.set(`${this.getNspForSocket(socket)}:${channel}:members`, members);

                resolve(members);
            });
        });
    }

    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket, data): Promise<any> {
        return new Promise((resolve, reject) => {
            this.authenticate(socket, data).then(res => {
                let member = res.channel_data;

                try {
                    member = JSON.parse(res.channel_data);
                } catch (e) {
                    //
                }

                if (!member) {
                    if (this.options.development) {
                        Log.error('Unable to join channel. Member data for presence channel missing.');
                    }

                    return;
                }

                socket.join(data.channel);

                this.isMember(data.channel, member, socket).then(isMember => {
                    this.getMembers(this.getNspForSocket(socket), data.channel).then(members => {
                        members = members || [];
                        member.socketId = socket.id;

                        if (!isMember) {
                            members.push(member);

                            this.db.set(`${this.getNspForSocket(socket)}:${data.channel}:members`, members);

                            members = [
                                ...members.reduce((map, member) => map.set(member.user_id, member), new Map).values()
                            ];

                            this.onSubscribed(socket, data.channel, members);
                            this.onJoin(socket, data.channel, member);
                        }

                        resolve(res);
                    }, (error) => Log.error(error));
                }, () => {
                    Log.error('Error retrieving pressence channel members.');
                });
            }, error => {
                if (this.options.development) {
                    Log.error(error.reason);
                }

                this.io.of(this.getNspForSocket(socket))
                    .to(socket.id)
                    .emit('subscription_error', data.channel, error.status);

                reject(error);
            });
        });
    }

    /**
     * Leave a channel. Remove a member from a
     * presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {void}
     */
    leave(socket: any, channel: string): void {
        this.getMembers(this.getNspForSocket(socket), channel).then(members => {
            members = members || [];
            let currentMember = members.find(member => member.socketId === socket.id);
            let otherMembers = members.filter(member => member.socketId !== currentMember.socketId);

            delete currentMember.socketId;

            this.db.set(`${this.getNspForSocket(socket)}:${channel}:members`, otherMembers);
            this.onLeave(socket, channel, currentMember);
        }, (error) => Log.error(error));
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
        super.onJoin(socket, channel, member);

        this.io.of(this.getNspForSocket(socket))
            .sockets
            .get(socket.id)
            .broadcast
            .to(channel)
            .emit('presence:joining', channel, member);
    }

    /**
     * Handle leaves.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onLeave(socket: any, channel: string, member: any): void {
        this.io.of(this.getNspForSocket(socket))
            .to(channel)
            .emit('presence:leaving', channel, member);
    }

    /**
     * Handle subscriptions.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any[]}  members
     * @return {void}
     */
    onSubscribed(socket: any, channel: string, members: any[]) {
        this.io.of(this.getNspForSocket(socket))
            .to(socket.id)
            .emit('presence:subscribed', channel, members);
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  namespace
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembers(namespace: any, channel: string): Promise<any> {
        return this.db.get(`${namespace}:${channel}:members`);
    }

    /**
     * Check if a user is on a presence channel.
     *
     * @param  {string}  channel
     * @param  {any}  member
     * @param  {any}  socket
     * @return {Promise<boolean>}
     */
    isMember(channel: string, member: any, socket: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getMembers(this.getNspForSocket(socket), channel).then(members => {
                this.removeInactive(channel, members, socket).then(members => {
                    let search = members.filter(m => m.user_id === member.user_id);

                    if (search && search.length) {
                        resolve(true);
                    }

                    resolve(false);
                });
            }, (error) => Log.error(error));
        });
    }
}

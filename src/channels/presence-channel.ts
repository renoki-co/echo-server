import { Database } from './../database';
import { Log } from './../log';

export class PresenceChannel {
    /**
     * Database instance.
     */
    db: Database;

    /**
     * Create a new Presence channel instance.
     *
     * @param  {any}  io
     * @param  {any}  options
     */
    constructor(protected io, protected options: any) {
        this.db = new Database(options);
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  channel
     * @return {Promise<any>}
     */
    getMembers(channel: string): Promise<any> {
        return this.db.get(`${channel}:members`);
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
            this.getMembers(channel).then((members) => {
                this.removeInactive(channel, members, socket).then((members: any) => {
                    let search = members.filter((m) => m.user_id === member.user_id);

                    if (search && search.length) {
                        resolve(true);
                    }

                    resolve(false);
                });
            }, (error) => Log.error(error));
        });
    }

    /**
     * Remove inactive channel members from the presence channel.
     *
     * @param  {string}  channel
     * @param  {any[]}  members
     * @param  {any}  socket
     * @return {Promise<any>}
     */
    removeInactive(channel: string, members: any[], socket: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.io.of(this.getNspForSocket(socket)).in(channel).allSockets().then(clients => {
                members = members || [];
                members = members.filter((member) => {
                    return clients.has(member.socketId);
                });

                this.db.set(`${channel}:members`, members);

                resolve(members);
            });
        });
    }

    /**
     * Join a presence channel and emit that they have joined only if it is the
     * first instance of their presence.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    join(socket: any, channel: string, member: any) {
        if (!member) {
            if (this.options.development) {
                Log.error('Unable to join channel. Member data for presence channel missing.');
            }

            return;
        }

        this.isMember(channel, member, socket).then((isMember) => {
            this.getMembers(channel).then((members) => {
                members = members || [];
                member.socketId = socket.id;
                members.push(member);

                this.db.set(`${channel}:members`, members);

                members = [
                    ...members.reduce((map, member) => map.set(member.user_id, member), new Map).values()
                ];

                this.onSubscribed(socket, channel, members);

                if (!isMember) {
                    this.onJoin(socket, channel, member);
                }
            }, (error) => Log.error(error));
        }, () => {
            Log.error('Error retrieving pressence channel members.');
        });
    }

    /**
     * Remove a member from a presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @return {void}
     */
    leave(socket: any, channel: string): void {
        this.getMembers(channel).then((members) => {
            members = members || [];

            let currentMember = members.find((member) => member.socketId === socket.id);
            let otherMembers = members.filter((member) => member.socketId !== currentMember.socketId);

            delete currentMember.socketId;
            this.db.set(`${channel}:members`, otherMembers);
            this.onLeave(socket, channel, currentMember);
        }, (error) => Log.error(error));
    }

    /**
     * On join event handler.
     *
     * @param  {any}  socket
     * @param  {string}  channel
     * @param  {any}  member
     * @return {void}
     */
    onJoin(socket: any, channel: string, member: any): void {
        this.io.of(this.getNspForSocket(socket))
            .sockets
            .get(socket.id)
            .broadcast
            .to(channel)
            .emit('presence:joining', channel, member);
    }

    /**
     * On leave emitter.
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
     * On subscribed event emitter.
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
     * Extract the namespace from socket.
     *
     * @param  {any}  socket
     * @return string
     */
    getNspForSocket(socket: any) {
        return socket ? socket.nsp.name : '/';
    }
}

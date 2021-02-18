import { Channel } from './channel';

const Pusher = require('pusher');

export class PrivateChannel extends Channel {
    /**
     * Join a given channel.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<any>}
     */
    join(socket: any, data: any): Promise<any> {
        return this.signatureIsValid(socket, data).then(isValid => {
            if (isValid) {
                return super.join(socket, data);
            }
        });
    }

    /**
     * Check is an incoming connection can subscribe.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<boolean>}
     */
    protected signatureIsValid(socket: any, data: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getSignedToken(socket, data).then(token => {
                resolve(token === data.token);
            });
        });
    }

    /**
     * Get the signed token from the given socket connection.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {Promise<string>}
     */
    protected getSignedToken(socket: any, data: any): Promise<string> {
        return new Promise((resolve, reject) => {
            let token = new Pusher.Token(socket.echoApp.key, socket.echoApp.secret);

            resolve(
                socket.echoApp.key + ':' + token.sign(this.getDataToSignForToken(socket, data))
            );
        });
    }

    /**
     * Get the data to sign for the token.
     *
     * @param  {any}  socket
     * @param  {any}  data
     * @return {string}
     */
    protected getDataToSignForToken(socket: any, data: any): string {
        return `${socket.id}:${data.channel}`;
    }
}

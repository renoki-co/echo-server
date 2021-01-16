export class App {
    /**
     * Initialize the app instance.
     *
     * @param {string} id
     * @param {string} key
     * @param {string} secret
     * @param {number} maxConnections
     * @param {string[]} allowedOrigins
     */
    constructor(
        public id: string,
        public key: string,
        public secret: string,
        public maxConnections: number,
        public allowedOrigins: string[],
    ) {
        //
    }
}

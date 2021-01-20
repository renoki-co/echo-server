export class App {
    /**
     * @type {string}
     */
    public id: string;

    /**
     * @type {string}
     */
    public key: string;

    /**
     * @type {string}
     */
    public secret: string;

    /**
     * @type {number}
     */
    public maxConnections: number;

    /**
     * @type {string[]}
     */
    public allowedOrigins: string[];

    /**
     * @type {string[]}
     */
    public authHosts: string[];

    /**
     * @type {string}
     */
    public authEndpoint: string;

    /**
     * Create a new app from object.
     *
     * @param {object} app
     */
    constructor(app: {
        id: string;
        key: string;
        secret: string;
        maxConnections: number;
        allowedOrigins: string[];
        authHosts: string[];
        authEndpoint: string;
    }) {
        this.id = app.id;
        this.key = app.key;
        this.secret = app.secret;
        this.maxConnections = app.maxConnections || -1;
        this.allowedOrigins = app.allowedOrigins || ['*'];
        this.authHosts = app.authHosts || ['http://127.0.1'];
        this.authEndpoint = app.authEndpoint || '/broadcasting/auth';
    }
}

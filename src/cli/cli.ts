import * as dot from 'dot-wild';
const echo = require('./../../dist');

export class Cli {
    /**
     * Create new CLI instance.
     */
    constructor() {
        this.options = echo.options;
    }

    /**
     * Default configuration options.
     */
    options: any;

    /**
     * Allowed environment variables.
     */
    envVariables: any = {
        ECHO_SERVER_AUTH_HOST: 'auth.host',
        ECHO_SERVER_AUTH_ENDPOINT: 'auth.endpoint',
        ECHO_SERVER_DATABASE_DRIVER: 'database.driver',
        ECHO_SERVER_DEBUG: 'development',
        ECHO_SERVER_SOCKET_HOST: 'host',
        ECHO_SERVER_SOCKET_PORT: 'port',
        ECHO_SERVER_REDIS_HOST: 'database.redis.host',
        ECHO_SERVER_REDIS_PORT: 'database.redis.port',
        ECHO_SERVER_REDIS_PASSWORD: 'database.redis.password',
        ECHO_SERVER_REDIS_KEY_PREFIX: 'database.redis.keyPrefix',
        ECHO_SERVER_SQLITE_PATH: 'sqlite.path',
        ECHO_SERVER_SSL_CERT: 'ssl.certPath',
        ECHO_SERVER_SSL_KEY: 'ssl.keyPath',
        ECHO_SERVER_SSL_CA: 'ssl.caPath',
        ECHO_SERVER_SSL_PASS: 'ssl.passphrase',
    };

    /**
     * Inject the .env vars into options if they exist.
     */
    overwriteFromEnv(options: any): any {
        require('dotenv').config();

        for (let key in this.envVariables) {
            let value = (process.env[key] || '').toString();

            if (value) {
                dot.set(this.options, key, value);
            }
        }

        return options;
    }

    /**
     * Start the Echo server.
     */
    start(yargs: any): void {
        const options = this.overwriteFromEnv(this.options);

        const handleFailure = () => {
            echo.stop();
            process.exit();
        }

        process.on('SIGINT', handleFailure);
        process.on('SIGHUP', handleFailure);
        process.on('SIGTERM', handleFailure);

        echo.run(options);
    }
}

import * as dot from 'dot-wild';

const echo = require('./../../dist');

export class Cli {
    /**
     * Default configuration options.
     */
    options: any;

    /**
     * Create new CLI instance.
     */
    constructor() {
        this.options = echo.options;
    }

    /**
     * Allowed environment variables.
     */
    envVariables: any = {
        APPS_MANAGER_DRIVER: 'appManager.driver',
        AUTH_HOST: 'auth.host',
        AUTH_ENDPOINT: 'auth.endpoint',
        DATABASE_DRIVER: 'database.driver',
        CORS_ALLOWED_ORIGINS: 'cors.origin',
        DEBUG: 'development',
        SOCKET_HOST: 'host',
        SOCKET_PORT: 'port',
        SOCKET_PROTOCOL: 'protocol',
        REDIS_HOST: 'database.redis.host',
        REDIS_PORT: 'database.redis.port',
        REDIS_PASSWORD: 'database.redis.password',
        REDIS_KEY_PREFIX: 'database.redis.keyPrefix',
        SSL_CERT: 'ssl.certPath',
        SSL_KEY: 'ssl.keyPath',
        SSL_CA: 'ssl.caPath',
        SSL_PASS: 'ssl.passphrase',
    };

    /**
     * Inject the .env vars into options if they exist.
     */
    overwriteOptionsFromEnv(): void {
        require('dotenv').config();

        for (let envVar in this.envVariables) {
            let value = process.env[envVar] || process.env[`ECHO_SERVER_${envVar}`] || null;
            let optionKey = this.envVariables[envVar.replace('ECHO_SERVER_', '')];

            if (value !== null) {
                let json = null;

                if (typeof value === 'string') {
                    try {
                        json = JSON.parse(value);
                    } catch (e) {
                        json = null;
                    }

                    if (json !== null) {
                        value = json;
                    }
                }

                this.options = dot.set(this.options, optionKey, value);
            }
        }
    }

    /**
     * Start the Echo server.
     */
    start(yargs: any): void {
        this.overwriteOptionsFromEnv();

        const handleFailure = () => {
            echo.stop();
            process.exit();
        }

        process.on('SIGINT', handleFailure);
        process.on('SIGHUP', handleFailure);
        process.on('SIGTERM', handleFailure);

        echo.run(this.options);
    }
}

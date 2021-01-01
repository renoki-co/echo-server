Revamped Echo Server
====================

![CI](https://github.com/renoki-co/echo-server/workflows/CI/badge.svg?branch=master)
[![License](https://poser.pugx.org/renoki-co/echo-server/license)](https://packagist.org/packages/renoki-co/echo-server)

Echo Server is a container-ready, multi-scalable Node.js application used to host your own Socket.IO server for Laravel.

This is a fork of the original [Laravel Echo Server package](https://github.com/tlaverdure/laravel-echo-server).

## 🤝 Supporting

Renoki Co. on GitHub aims on bringing a lot of open source projects and helpful projects to the world. Developing and maintaining projects everyday is a harsh work and tho, we love it.

If you are using your application in your day-to-day job, on presentation demos, hobby projects or even school projects, spread some kind words about our work or sponsor our work. Kind words will touch our chakras and vibe, while the sponsorships will keep the open source projects alive.

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R42U8CL)

## Current Milestones

- Docker Container support
- Horizontal scaling
- Linting
- Testing

## System Requirements

The following are required to function properly:

- Laravel 6.x+
- Node 10.0+
- Redis 5+

Additional information on broadcasting with Laravel can be found in the official docs: <https://laravel.com/docs/master/broadcasting>

## 🚀 Installation

You can install the package via npm:

```bash
npm install -g echo-server-revamped
```

## 🙌 Usage

You can run Echo Server directly from the CLI:

```bash
$ echo-server start
```

## Diferences between Laravel Echo Server and Echo Revamped

The main differences are that Echo Revamped gets rid of the idea of `Clients` and `Configuration File` that is an anti-pattern to the secrets at the repository level. Instead, you might want to rely on Environment Variables to pass data to the options when running a server. Additionally, the clients were not used directly by the frontend workers like Pusher does, so the concept got removed.

## Environment Variables

Since there is no configuration file, you may declare the parameters using environment variables directly passed in the CLI, either as key-value attributes in an `.env` file at the root of the project:

```bash
$ ECHO_DATABASE_DRIVER=redis echo-server start
```

```bash
# Within your .env file
ECHO_DATABASE_DRIVER=redis
```

### Available environment variables

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `ECHO_SERVER_AUTH_HOST` | `auth.host` | `http://127.0.0.1` | - | The host for the Laravel application. |
| `ECHO_SERVER_AUTH_ENDPOINT` | `auth.endpoint` | `/broadcasting/auth` | - | The path for the Laravel application's auth path used for authentication. |
| `ECHO_SERVER_DATABASE_DRIVER` | `database.driver` | `redis` | `redis`, `sqlite` | The database driver for storing socket data. Use `redis` or other centralized method for storing data. |
| `ECHO_SERVER_CORS_ALLOWED_ORIGINS` | `cors.origin` | `['http:/127.0.0.1']` | - | The array of allowed origins that can connect to the WS. |
| `ECHO_SERVER_DEBUG` | `development` | `false` | `true`, `false` | Weteher the app should be in development mode. |
| `ECHO_SERVER_SOCKET_HOST` | `host` | `null` | - |The host used for Socket.IO |
| `ECHO_SERVER_SOCKET_PORT` | `port` | `6001` | - | The port used for Socket.IO |
| `ECHO_SERVER_SOCKET_PROTOCOL` | `protocol` | `http` | `http`, `https` | The protocol used for the Socket.IO. |
| `ECHO_SERVER_REDIS_HOST` | `database.redis.host` | `127.0.0.1` | - | The Redis host used for `redis` driver. |
| `ECHO_SERVER_REDIS_PORT` | `database.redis.port` | `6379` | - | The Redis port used for `redis` driver. |
| `ECHO_SERVER_REDIS_PASSWORD` | `database.redis.password` | `null` | - | The Redis password used for `redis` driver. |
| `ECHO_SERVER_REDIS_KEY_PREFIX` | `database.redis.keyPrefix` | `echo-server` | - | The key prefix for Redis. Only for `redis` driver. |
| `ECHO_SERVER_SQLITE_PATH` | `sqlite.path` | `/database/echo-server.sqlite` | - |The path used to create and store the SQLite key-value file. |
| `ECHO_SERVER_SSL_CERT` | `ssl.certPath` | `''` | - | The path for SSL certificate file. |
| `ECHO_SERVER_SSL_KEY` | `ssl.keyPath` | `''` | - | The path for SSL key file. |
| `ECHO_SERVER_SSL_CA` | `ssl.caPath` | `''` | - | The path for CA certificate file. |
| `ECHO_SERVER_SSL_PASS` | `ssl.passphrase` | `''` | - | The passphrase for the SSL key file. |

## 🤝 Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## 🔒  Security

If you discover any security related issues, please email alex@renoki.org instead of using the issue tracker.

## 🎉 Credits

- [Thiery Laverdure](https://github.com/tlaverdure)
- [Alex Renoki](https://github.com/rennokki)
- [All Contributors](../../contributors)

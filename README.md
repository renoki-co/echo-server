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
$ DATABASE_DRIVER=redis echo-server start
```

When using .env, you shall prefix them with `ECHO_SERVER_`:

```bash
# Within your .env file
ECHO_SERVER_DATABASE_DRIVER=redis
```

### Available environment variables

| Environment variable | Object dot-path | Default | Available values | Description |
| - | - | - | - | - |
| `AUTH_HOST` | `auth.host` | `http://127.0.0.1` | - | The host for the Laravel application. |
| `AUTH_ENDPOINT` | `auth.endpoint` | `/broadcasting/auth` | - | The path for the Laravel application's auth path used for authentication. |
| `DATABASE_DRIVER` | `database.driver` | `redis` | `redis` | The database driver for storing socket data. Use `redis` or other centralized method for storing data. |
| `CORS_ALLOWED_ORIGINS` | `cors.origin` | `['http:/127.0.0.1']` | - | The array of allowed origins that can connect to the WS. |
| `DEBUG` | `development` | `false` | `true`, `false` | Weteher the app should be in development mode. |
| `SOCKET_HOST` | `host` | `null` | - |The host used for Socket.IO |
| `SOCKET_PORT` | `port` | `6001` | - | The port used for Socket.IO |
| `SOCKET_PROTOCOL` | `protocol` | `http` | `http`, `https` | The protocol used for the Socket.IO. |
| `REDIS_HOST` | `database.redis.host` | `127.0.0.1` | - | The Redis host used for `redis` driver. |
| `REDIS_PORT` | `database.redis.port` | `6379` | - | The Redis port used for `redis` driver. |
| `REDIS_PASSWORD` | `database.redis.password` | `null` | - | The Redis password used for `redis` driver. |
| `REDIS_KEY_PREFIX` | `database.redis.keyPrefix` | `echo-server` | - | The key prefix for Redis. Only for `redis` driver. |
| `SSL_CERT` | `ssl.certPath` | `''` | - | The path for SSL certificate file. |
| `SSL_KEY` | `ssl.keyPath` | `''` | - | The path for SSL key file. |
| `SSL_CA` | `ssl.caPath` | `''` | - | The path for CA certificate file. |
| `SSL_PASS` | `ssl.passphrase` | `''` | - | The passphrase for the SSL key file. |

## Docker Images

The package was built and oriented to a scalable approach, meaning it supports multi-node & multi-process configurations, but also Docker for rapid scaling on certain infrastructure, like Kubernetes.

Container versioning is done the same way like the package versioning. You can find some of the tags in [the official Docker repository](https://hub.docker.com/r/renokico/echo-server).

You can pull various versions:

```bash
$ docker pull renokico/echo-server:latest
```

```bash
$ docker pull renokico/echo-server:1.0.0
```

## 🤝 Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## 🔒  Security

If you discover any security related issues, please email alex@renoki.org instead of using the issue tracker.

## 🎉 Credits

- [Thiery Laverdure](https://github.com/tlaverdure)
- [Alex Renoki](https://github.com/rennokki)
- [All Contributors](../../contributors)

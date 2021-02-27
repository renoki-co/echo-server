Echo Server - deprecated; move to [soketi/echo-server](https://github.com/soketi/echo-server)
=============================================================================================

![CI](https://github.com/renoki-co/echo-server/workflows/CI/badge.svg?branch=master)
[![codecov](https://codecov.io/gh/renoki-co/echo-server/branch/master/graph/badge.svg)](https://codecov.io/gh/renoki-co/echo-server/branch/master)
[![Latest Stable Version](https://img.shields.io/github/v/release/renoki-co/echo-server)](https://www.npmjs.com/package/@renoki-co/echo-server)
[![Total Downloads](https://img.shields.io/npm/dt/@renoki-co/echo-server)](https://www.npmjs.com/package/@renoki-co/echo-server)
[![License](https://img.shields.io/npm/l/@renoki-co/echo-server)](https://www.npmjs.com/package/@renoki-co/echo-server)


Echo Server is a Docker-ready, multi-scalable Node.js application used to host your own Socket.IO server for Laravel Broadcasting.
It is built on top of Socket.IO and has a Pusher-compatible API server beneath, that makes your implementation in Laravel a breeze.

This is a fork of the original [Laravel Echo Server package](https://github.com/tlaverdure/laravel-echo-server) that was heavily modified.

## 🤝 Supporting

Renoki Co. on GitHub aims on bringing a lot of open source projects and helpful projects to the world. Developing and maintaining projects everyday is a harsh work and tho, we love it.

If you are using your application in your day-to-day job, on presentation demos, hobby projects or even school projects, spread some kind words about our work or sponsor our work. Kind words will touch our chakras and vibe, while the sponsorships will keep the open source projects alive.

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/R6R42U8CL)

## Current Milestones

- Prometheus Exporting
- Testing

## System Requirements

The following are required to function properly:

- Laravel 6.x+
- Node 10.0+
- Redis 6+ (optional)

Additional information on broadcasting with Laravel can be found in the official [Broadcasting docs](https://laravel.com/docs/master/broadcasting)

## 🚀 Installation

You can install the package via npm:

```bash
npm install -g @renoki-co/echo-server
```

## 🙌 Usage

You can run Echo Server directly from the CLI:

```bash
$ echo-server start
```

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

Check the [environment variables documentation](docs/ENV.md) on how you can configure the replication and distribution drivers among the app.

## Pusher Compatibility

This server has API (but no WS) compatibility with the Pusher clients. This means that you can use the `pusher` broadcasting driver pointing to the server and expect for it to fully work.

However, you still need to declare the apps that can be used either by static listing, or by setting an exposed app driver. You will need to add a new connection to the broadcasting list:

```php
'socketio' => [
    'driver' => 'pusher',
    'key' => env('SOCKETIO_APP_KEY'),
    'secret' => env('SOCKETIO_APP_SECRET'),
    'app_id' => env('SOCKETIO_APP_ID'),
    'options' => [
        'cluster' => env('SOCKETIO_APP_CLUSTER'),
        'encrypted' => true,
        'host' => env('SOCKETIO_HOST', '127.0.0.1'),
        'port' => env('SOCKETIO_PORT', 6001),
        'scheme' => 'http',
        'curl_options' => [
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
        ],
    ],
],
```

```env
BROADCAST_DRIVER=socketio

SOCKETIO_HOST=127.0.0.1
SOCKETIO_PORT=6001
SOCKETIO_APP_ID=echo-app
SOCKETIO_APP_KEY=echo-app-key
SOCKETIO_APP_SECRET=echo-app-secret

# These are the default values to connect to. It's recommended to specify the server an `APPS_LIST`
# or override these values using `APP_DEFAULT_*` keys.
# For production workloads, it's a MUST to change the default values.

ECHO_SERVER_APP_DEFAULT_ID=echo-app
ECHO_SERVER_DEFAULT_KEY=echo-app-key
ECHO_SERVER_DEFAULT_SECRET=echo-app-secret
```

## Frontend (Client) Configuration

For this server, Laravel Echo is not suitable. You should install [`@soketi/soketi-js`](https://github.com/soketi/soketi-js).

Soketi.js is a hard fork of [laravel/echo](https://github.com/laravel/echo), meaning that you can use it as a normal Echo client, being fully compatible with all the docs [in the Broadcasting docs](https://laravel.com/docs/8.x/broadcasting).

```bash
$ npm install --save-dev @soketi/soketi-js
```

The Socket.IO client can be easily namespaced by using the `SOCKETIO_APP_KEY` value, so that it can listen to the `echo-app-key` namespace. If the namespace is not provided, you will likely see it not working because the defined clients list has only one app, with the ID `echo-app-key`, so this is the namespace it will broadcast to.

```js
import Soketi from '@soketi/soketi-js';

window.io = require('socket.io-client');

window.Soketi = new Soketi({
    host: window.location.hostname,
    port: 6001,
    key: 'echo-app-key', // should be replaced with the App Key
    authHost: 'http://127.0.0.1',
    authEndpoint: '/broadcasting/auth',
    transports: ['websocket'],
});

// for example
Soketi.channel('twitter').listen('.tweet', e => {
    console.log(e);
});
```

## App Management

By default, the apps can be defined by passing an array, as explained earlier, using `APPS_LIST` variable.

However, you might want to store multiple apps in a dynamic & controlled manner. The `api` driver comes in place to help with that. You can specify the host, endpoint and a verification token that can make requests on Echo Server's behalf and retrieve the apps.

In Laravel, you can use [renoki-co/echo-server-core](https://github.com/renoki-co/echo-server-core), and extend the functionality for the `api` driver by storing the apps into database. It comes out-of-the-box with migrations and models, so you can immediately extend the core functionality for Echo Server.

## Local Drivers

By default, Redis is used to store presence channels' data and communicate between other nodes/processes when runing at scale. However, if you have a single monolithic application or a single-node, single-process Node.js process app, you can simply just call the driver as `local`:

```bash
$ DATABASE_DRIVER=local echo-server start
```

## Deploying with PM2

This server is PM2-ready and [can scale to a lot of processes](docs/PM2.md).

## Docker Images

Automatically, after each release, a Docker tag is created with an image that holds the app code. [Read about versions & usage on DockerHub](https://hub.docker.com/r/renokico/echo-server).

## 🤝 Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## 🔒  Security

If you discover any security related issues, please email alex@renoki.org instead of using the issue tracker.

## 🎉 Credits

- [Thiery Laverdure](https://github.com/tlaverdure)
- [Alex Renoki](https://github.com/rennokki)
- [All Contributors](../../contributors)

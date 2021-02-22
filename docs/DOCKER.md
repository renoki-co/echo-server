# Docker

The package was built and oriented to a scalable approach, meaning it supports multi-node & multi-process configurations, but also Docker for rapid scaling on certain infrastructure, like Kubernetes.

Container versioning is done the same way like the package versioning. You can find some of the tags in [the official Docker repository](https://hub.docker.com/r/renokico/echo-server).

# Pulling

You can pull various versions:

```bash
$ docker pull renokico/echo-server:latest
```

```bash
$ docker pull renokico/echo-server:3.0.1
```

To run in Docker, you can simply:

```bash
$ docker run -p 6001:6001 renokico/echo-server:3.0.1
```

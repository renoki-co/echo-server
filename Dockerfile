FROM node:lts-alpine3.10

LABEL maintainer="Renoki Co. <alex@renoki.org>"

COPY . /app

RUN cd /app && \
    apk add --update --no-cache curl && \
    npm ci && \
    npm run prepublish && \
    ln -s /app/bin/server.js /usr/bin/echo-server

EXPOSE 6001

WORKDIR /app

ENTRYPOINT ["echo-server", "start"]

FROM node:lts-alpine3.10

LABEL maintainer="Renoki Co. <alex@renoki.org>"

COPY . /app

RUN cd /app && \
    npm install && \
    npm run lint && \
    npm run build && \
    ln -s /app/bin/server.js /usr/bin/echo-server && \
    rm -rf src/ tests/

EXPOSE 6001

WORKDIR /app

ENTRYPOINT ["echo-server", "start"]

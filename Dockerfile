ARG VERSION=lts

FROM node:$VERSION

LABEL maintainer="Renoki Co. <alex@renoki.org>"

COPY . /app

RUN cd /app && \
    mkdir stats && \
    npm install && \
    npm run lint && \
    npm run build && \
    rm -rf src/ tests/

EXPOSE 6001

WORKDIR /app

ENTRYPOINT ["node", "/app/bin/server.js", "start"]

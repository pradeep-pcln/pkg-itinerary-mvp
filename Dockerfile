FROM gcr.io/pcln-pl-gcr-prod/pcln-rockylinux-node24:latest

ARG APPLICATION_NAME=mobility-vibes
ARG VERSION

RUN test -n "${APPLICATION_NAME}" || (echo "APPLICATION_NAME  not set" && false)

RUN test -n "${VERSION}" || (echo "VERSION  not set" && false)

RUN mkdir ${APPLICATION_NAME}

WORKDIR /apps/home/eng/${APPLICATION_NAME}

COPY --chown=eng:engadmin dist .

RUN echo "{\"appVersion\": \"${VERSION}\",\"appName\": \"${APPLICATION_NAME}\"}" > ./version.json
RUN if [ -d "public" ]; then echo "{\"appVersion\": \"${VERSION}\",\"appName\": \"${APPLICATION_NAME}\"}" > public/version.json; fi;

ARG PORT=8080
ENV PORT=${PORT}

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ENV NODE_OPTIONS=--max-old-space-size=1536

CMD ["node", "server.js"]
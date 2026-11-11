# syntax=docker/dockerfile:1

FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS base

FROM base AS pnpm
COPY --from=ghcr.io/pnpm/pnpm:12-alpine@sha256:937d5b248145cd59aaf3d78dd0fd45f95e65b942585c370a0a11d53ab937ed98 /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done
WORKDIR /app

FROM pnpm AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --prod --frozen-lockfile

FROM pnpm AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --frozen-lockfile
COPY ./ ./
RUN pnpm run build

FROM base
COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=build /app/lib /app/lib
CMD ["node", "--enable-source-maps", "/app/lib/entrypoint.js"]

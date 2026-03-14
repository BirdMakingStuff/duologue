# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
# not needed for now
# RUN bun test
RUN bun run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/dist ./dist
COPY --from=prerelease /usr/src/app/package.json .

# Ensure runtime storage path is writable when running as the non-root bun user.
RUN mkdir -p /usr/src/app/data \
	&& printf '{"courses":{},"announcementBindings":{},"threadBindings":{}}\n' > /usr/src/app/data/ed-storage.json \
	&& chown -R bun:bun /usr/src/app/data

# run the app
USER bun
ENTRYPOINT [ "bun", "run", "start" ]
FROM node:24-bookworm AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json tsconfig.json /temp/dev/
WORKDIR /temp/dev
RUN npm install

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
WORKDIR /temp/prod
RUN npm install --production --omit=dev

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/dist ./dist
COPY --from=prerelease /usr/src/app/package.json .

# Ensure runtime storage path is writable when running as the non-root node user.
RUN mkdir -p /usr/src/app/data \
	&& printf '{"courses":{},"announcementBindings":{},"threadBindings":{}}\n' > /usr/src/app/data/ed-storage.json \
	&& chown -R node:node /usr/src/app/data

# run the app
USER node
ENTRYPOINT [ "node", "dist/index.js" ]
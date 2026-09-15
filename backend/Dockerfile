FROM node:24-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["yarn", "start:dev"]

FROM base AS build
COPY . .
RUN yarn build && yarn install --production --frozen-lockfile --ignore-scripts

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
CMD ["node", "dist/main"]

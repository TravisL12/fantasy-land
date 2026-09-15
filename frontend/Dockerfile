FROM node:24-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["yarn", "dev", "--host", "0.0.0.0"]

FROM base AS build
COPY . .
RUN yarn build

FROM nginx:alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

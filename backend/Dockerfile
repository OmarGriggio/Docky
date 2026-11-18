# ---- base : shared deps layer ----
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./

# ---- dev : hot-reload, used by docker-compose.yml (target: dev) ----
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- build : compiles TypeScript to dist/ ----
FROM base AS build
RUN npm install
COPY . .
RUN npm run build

# ---- prod : lean runtime image, no devDependencies, no source, non-root ----
FROM node:22-slim AS prod
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# The fonts documents can be printed in (src/pdf/core/pdf-fonts.ts reads them from /app/assets/fonts).
COPY --from=build /app/assets ./assets
USER node
EXPOSE 3000
CMD ["npm", "start"]

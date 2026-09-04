# ---- build : compiles the Angular app to static files ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- prod : the build output served as static files by nginx ----
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

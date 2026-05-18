# Build Stage
FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retries 5 && \
    npm install --legacy-peer-deps

COPY . .

# Build-time Vite envs (baked into the static bundle)
ARG VITE_API_URL
ARG VITE_WA_ENGINE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WA_ENGINE_URL=$VITE_WA_ENGINE_URL

RUN npm run build

# Production Stage
FROM nginx:alpine

# Vite'ın build çıktısını Nginx'in statik dosya klasörüne kopyala
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Nginx portu
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
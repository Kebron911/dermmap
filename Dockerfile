# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# VITE_AUTH_PROVIDER must be 'custom' for production to disable demo mode.
# Pass as a build arg: docker build --build-arg VITE_AUTH_PROVIDER=custom ...
ARG VITE_AUTH_PROVIDER=custom
ENV VITE_AUTH_PROVIDER=$VITE_AUTH_PROVIDER
RUN npm run build

# --- Production stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

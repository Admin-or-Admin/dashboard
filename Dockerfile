# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY dashboard/package*.json ./
RUN npm install
COPY dashboard/ .
RUN npm run build

# Serve stage
FROM nginx:alpine

# Install nodejs to run the config generator
RUN apk add --no-cache nodejs

# Copy the build output from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the generator script
COPY --from=build /app/generate-env.js /app/generate-env.js

# Set the output path for the runtime config
ENV ENV_CONFIG_OUTPUT=/usr/share/nginx/html/env-config.js

# Standard nginx config for SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["sh", "-c", "node /app/generate-env.js && nginx -g 'daemon off;'"]

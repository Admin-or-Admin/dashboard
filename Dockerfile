# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy the package.json and package-lock.json files
COPY dashboard/package*.json ./

# Install packages
RUN npm install

# Copy the dashboard source
COPY dashboard/ .

# Build the Vite application
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy the build output from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy entrypoint script
COPY dashboard/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port 80
EXPOSE 80

# Use the entrypoint script to inject runtime environment variables
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

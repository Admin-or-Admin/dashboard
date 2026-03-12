# Build stage
FROM node:20-slim AS build

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files into the container at /app
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the current directory contents into the container at /app
COPY . .

# Build the Vite application
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy the build output from the build stage to the nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 to the outside world
EXPOSE 80

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]

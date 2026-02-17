# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Install missing dependency
RUN npm install ajv@^8.0.0 --legacy-peer-deps

COPY . .

# Build the app
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Custom Nginx config to handle React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

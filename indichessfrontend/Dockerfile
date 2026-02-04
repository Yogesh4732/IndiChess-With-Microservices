# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build
COPY . ./
RUN npm run build


# ---------- Runtime stage ----------
FROM nginx:alpine

# Copy built React app to Nginx html directory
COPY --from=build /app/build /usr/share/nginx/html

# Optional: custom Nginx config could be added here if needed for routing
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

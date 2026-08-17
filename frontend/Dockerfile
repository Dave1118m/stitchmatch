# ==========================================
# StitchMatch Frontend Production Dockerfile
# ==========================================

FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle with Vite
RUN npm run build

# Nginx static server stage
FROM nginx:alpine AS runner

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard web port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

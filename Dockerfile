# Frontend Build Stage
FROM node:20 AS frontend-builder
WORKDIR /app/frontend

# Copy package files
COPY package.json package-lock.json* bun.lockb* ./
RUN npm install

# Copy frontend source code
COPY . .

# Copy .env for frontend build
COPY .env .env

# Build argument for API URL
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Clean previous build (if any)
RUN rm -rf dist

# Build frontend
RUN npm run build

# Final Stage - Python with Frontend
FROM python:3.12-slim

WORKDIR /app

# Log klasörünü oluştur
RUN mkdir -p /app/logs

# Install system dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --upgrade openai && \
    pip install --no-cache-dir supervisor

# Copy backend code
COPY backend/ ./backend/
COPY supervisord.conf ./
COPY start.sh ./
COPY data/ ./data/

# Copy .env for backend
COPY .env .env

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create nginx config for serving frontend
RUN echo 'events { \
    worker_connections 1024; \
} \
\
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    \
    upstream backend { \
        server 127.0.0.1:8000; \
    } \
    \
    server { \
        listen 3000; \
        server_name localhost; \
        root /app/frontend/dist; \
        index index.html; \
        \
        # Enable gzip \
        gzip on; \
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
        \
        # Serve static files \
        location / { \
            try_files $uri $uri/ /index.html; \
        } \
        \
        # Proxy API requests to backend \
        location /api/ { \
            proxy_pass http://backend/api/; \
            proxy_set_header Host $host; \
            proxy_set_header X-Real-IP $remote_addr; \
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
            proxy_set_header X-Forwarded-Proto $scheme; \
            proxy_buffering off; \
            proxy_connect_timeout 60s; \
            proxy_send_timeout 60s; \
            proxy_read_timeout 60s; \
            proxy_http_version 1.1; \
            proxy_set_header Connection ""; \
        } \
        \
        # Health check endpoint \
        location /nginx-health { \
            access_log off; \
            return 200 "healthy"; \
            add_header Content-Type text/plain; \
        } \
    } \
}' > /etc/nginx/nginx.conf

# Make start script executable
RUN chmod +x start.sh

# Expose both frontend and backend ports
EXPOSE 3000 8000

CMD ["supervisord", "-c", "/app/supervisord.conf"]

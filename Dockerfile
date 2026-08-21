FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Set working directory
WORKDIR /app

# Copy package dependency definitions
COPY package*.json ./

# Skip browser download during install since they are pre-baked in the base image
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Build the application (frontend static files and backend server bundle)
RUN npm run build

# Expose server port
EXPOSE 3000

# Start server
CMD ["npm", "start"]

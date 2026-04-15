# Use Node.js 20 as base
FROM node:20-slim

# Install system dependencies for Python and Playwright
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy requirements.txt and install Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

# Install Playwright browsers (Chromium) and its system dependencies
RUN npx playwright install --with-deps chromium

# Copy the rest of the backend files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_PATH=python3

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]

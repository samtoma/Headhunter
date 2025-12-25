FROM node:20-slim

# Install system dependencies required for Cypress and debugging
RUN apt-get update && apt-get install -y \
    libgtk2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json .
RUN npm install
RUN npx cypress install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

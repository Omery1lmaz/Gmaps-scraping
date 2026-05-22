FROM node:22-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ENV DEBIAN_FRONTEND=${DEBIAN_FRONTEND}

# Install Chrome/Chromium dependencies + core tools
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libnss3-tools \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libxshmfence1 \
    libdrm2 \
    libgtk-3-0 \
    libcups2 \
    fonts-liberation \
    libappindicator1 \
    lsb-release \
    xdg-utils \
    wget \
    gnupg \
 && mkdir -p /lib64 && ln -sf /lib/ld-linux-x86-64.so.2 /lib64/ld-linux-x86-64.so.2 2>/dev/null || true \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3002

# Use system-installed Chromium (avoid bundled binary arch issues)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_CHROMIUM_REVISION=1

COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && (test -x /usr/bin/chromium || test -x /usr/bin/chromium-browser) \
    && ln -sf "$(command -v chromium || command -v chromium-browser)" /usr/bin/chromium-rove

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-rove \
    CHROME_BIN=/usr/bin/chromium-rove \
    WWEBJS_AUTH_PATH=/data/.wwebjs_auth \
    NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

# Evitar download do Chrome embebido do Puppeteer durante npm ci
RUN npm ci --omit=dev \
    && rm -rf /root/.cache/puppeteer 2>/dev/null || true

COPY server.js ./

RUN mkdir -p /data/.wwebjs_auth

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

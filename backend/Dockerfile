FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN npm install --no-audit --no-fund --loglevel=error 2>&1 || npm install --no-audit --no-fund --loglevel=error
COPY . .
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]

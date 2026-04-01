FROM node:22-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install && npm cache clean --force

# Copy TypeScript source
COPY *.ts ./
COPY tsconfig.json ./

EXPOSE 4000

CMD ["node", "--import", "tsx", "server.ts"]

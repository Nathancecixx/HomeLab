FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/contracts/tsconfig.json packages/contracts/tsconfig.json
COPY packages/core/package.json packages/core/package.json
COPY packages/core/tsconfig.json packages/core/tsconfig.json

RUN npm ci

COPY . .

RUN npm run build -w @data-hub/contracts \
  && npm run build -w @data-hub/core \
  && npm run build -w @data-hub/api

CMD ["npm", "run", "start", "-w", "@data-hub/api"]

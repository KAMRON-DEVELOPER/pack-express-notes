FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and config
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Run
FROM node:24-alpine

ENV PORT=3000
ENV SERVICE_NAME='notes-service'

WORKDIR /app

# Copy built artifacts and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

EXPOSE ${PORT}

CMD ["node", "dist/app.js"]
FROM node:20-slim AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production
ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "run", "start"]

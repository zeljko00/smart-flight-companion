FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Application source code will be added to the container via bind mount

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
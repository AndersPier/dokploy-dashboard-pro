FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --only=production

# Copy app files
COPY . .

# Build the app
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

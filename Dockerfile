FROM node:18-alpine
#RUN addgroup -g 1001 -S docker && adduser -S nextjs -u 1001 -G docker
RUN addgroup -g 988 -S docker && adduser -S nextjs -u 1001 -G docker
USER nextjs

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

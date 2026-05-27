FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for caching dependencies
COPY package*.json ./

RUN npm install

# Copy all local files into the image
COPY . .

# Expose backend port
EXPOSE 5000

# Start development server
CMD ["npm", "run", "dev"]

FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for caching dependencies
COPY package*.json ./

RUN npm install

# Copy all local files into the image
COPY . .

# Expose Vite development port
EXPOSE 5173

# Start development server, bound to 0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]

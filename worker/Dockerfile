FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
CMD ["npm", "test"]

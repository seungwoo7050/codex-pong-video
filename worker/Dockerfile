FROM node:20-bookworm
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg build-essential cmake \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY native ./native
RUN npm run build
RUN cmake -S native -B native/build && cmake --build native/build
CMD ["npm", "run", "start"]

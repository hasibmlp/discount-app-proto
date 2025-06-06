FROM node:20-alpine

EXPOSE 3000
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build
RUN npm run setup

CMD ["npm", "run", "start"]

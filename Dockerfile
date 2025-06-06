FROM node:20-alpine

EXPOSE 3000
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

CMD ["sh", "-c", "echo 'Container starting...' && echo '--- Running Database Migrations ---' && npx prisma migrate deploy && echo '--- Migrations Finished ---' && echo '--- Starting Application Server ---' && npm run start"]

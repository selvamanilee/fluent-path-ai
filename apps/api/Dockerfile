FROM node:22-slim
WORKDIR /app
COPY db /db
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api ./
RUN npx next build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.ts && node scripts/seed.ts && npx next start -p 3000"]

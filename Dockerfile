# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

ENV NODE_ENV=production
ENV PORT=3009

EXPOSE 3009

RUN mkdir -p uploads && chown -R node:node uploads

USER node

CMD ["npm", "start"]

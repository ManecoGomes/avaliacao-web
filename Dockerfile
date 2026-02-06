# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Install gog CLI + dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip \
  && rm -rf /var/lib/apt/lists/*

  # Install gog (gogcli) binary
  RUN curl -fsSL https://github.com/steipete/gogcli/releases/download/v0.9.0/gogcli_0.9.0_linux_amd64.tar.gz -o /tmp/gog.tar.gz \
   && tar -xzf /tmp/gog.tar.gz -C /usr/local/bin/ \
    && chmod +x /usr/local/bin/gog \
     && rm /tmp/gog.tar.gz
ENV NODE_ENV=production

# Next.js standalone is not enabled; we ship full app + node_modules
COPY --from=build /app .

EXPOSE 3000
CMD ["npm","run","start","--","-p","3000"]

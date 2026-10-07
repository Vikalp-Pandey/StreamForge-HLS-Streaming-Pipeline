FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable \
    && corepack prepare pnpm@10.30.3 --activate

WORKDIR /workspace

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/transcoder build

ENV FFMPEG_PATH=ffmpeg
ENV TRANSCODER_PORT=8080

EXPOSE 8080

CMD ["pnpm", "--filter", "@repo/transcoder", "exec", "tsx", "src/index.ts"]

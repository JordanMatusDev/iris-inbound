# Etapa 1: Compilación (Builder)
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copiamos los archivos (Bun usa bun.lockb o bun.lock en lugar de pnpm-lock.yaml)
COPY package.json bun.lock ./

# Instalamos todas las dependencias
RUN bun install --frozen-lockfile

# Copiamos el resto del código y compilamos Analog
COPY . .
RUN bun run build

# Etapa 2: Producción (Runner)
FROM oven/bun:1-alpine
WORKDIR /app

# Copiamos la carpeta dist generada en la etapa anterior
COPY --from=builder /app/dist/analog ./dist/analog
COPY package.json bun.lock ./

# Instalamos SOLAMENTE las dependencias de producción
RUN bun install --production --frozen-lockfile

# Exponemos el puerto de Nitro
EXPOSE 3000

# Comando para arrancar el servidor Nitro usando Bun
CMD ["bun", "run", "dist/analog/server/index.mjs"]
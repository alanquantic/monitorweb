# Usar imagen oficial de Node.js con Playwright
FROM mcr.microsoft.com/playwright:v1.48.0-focal

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p screenshots reports

# Exponer puerto (aunque no sea necesario para cron jobs)
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["npm", "start"] 
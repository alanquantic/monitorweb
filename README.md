# 🌐 Monitor Automático de Sitios Web

Sistema de monitoreo automático que toma capturas de pantalla de sitios web, las organiza por fecha/hora y envía reportes por email. Perfecto para monitorear el estado visual de múltiples sitios web.

## ✨ Características

- 📸 **Capturas automáticas** con Playwright (soporte multi-navegador)
- ⏰ **Monitoreo programado** (por defecto 3 veces al día)
- 📁 **Organización automática** por carpetas de fecha/hora
- 📧 **Notificaciones por email** con reportes detallados
- 🧹 **Limpieza automática** de capturas antiguas
- 📊 **Estadísticas básicas** de rendimiento
- 🔧 **Configuración flexible** via JSON y variables de entorno

## 🚀 Instalación Rápida

### 1. Clonar o descargar el proyecto

```bash
# Si tienes git
git clone [url-del-repo]
cd website-monitor

# O simplemente descarga y extrae el ZIP
```

### 2. Instalar dependencias

```bash
npm run setup
```

Este comando instala las dependencias Node.js y los navegadores de Playwright.

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tus datos
nano .env  # o tu editor preferido
```

**Configuración mínima requerida:**
```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password-de-gmail
EMAIL_TO=destinatario@gmail.com
```

### 4. Configurar sitios a monitorear

Edita `config/sites.json` con tus sitios:

```json
{
  "sites": [
    {
      "id": "mi-sitio-principal",
      "name": "Mi Sitio Principal",
      "url": "https://mi-sitio.com",
      "enabled": true,
      "waitForSelector": "header",
      "screenshotOptions": {
        "fullPage": true,
        "quality": 90
      }
    }
  ]
}
```

### 5. Ejecutar

```bash
# Prueba única
npm test

# Monitoreo continuo
npm start
```

## 📋 Configuración Detallada

### Variables de Entorno (.env)

```env
# Email (Requerido para notificaciones)
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-app-password
EMAIL_TO=destinatario@gmail.com

# Monitoreo
MONITOR_INTERVAL_HOURS=8          # Cada cuantas horas ejecutar
MAX_SCREENSHOTS_PER_SITE=10       # Máximo de capturas por sitio
ENABLE_EMAIL_NOTIFICATIONS=true   # Enviar emails

# Captura
SCREENSHOT_QUALITY=90
FULL_PAGE_SCREENSHOTS=true
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080
```

### Configuración de Sitios (config/sites.json)

```json
{
  "sites": [
    {
      "id": "identificador-unico",
      "name": "Nombre Descriptivo",
      "url": "https://sitio.com",
      "enabled": true,
      "waitForSelector": "header",  // Opcional: esperar elemento
      "screenshotOptions": {
        "fullPage": true,
        "quality": 90
      }
    }
  ],
  "defaultOptions": {
    "timeout": 30000,
    "waitTime": 3000,
    "retryAttempts": 3,
    "screenshotFormat": "png"
  }
}
```

## 🗂️ Estructura de Carpetas

El monitor organizará automáticamente las capturas:

```
screenshots/
├── sitio1/
│   ├── 2024-01-15/
│   │   ├── 08-00-00.png
│   │   ├── 16-00-00.png
│   │   └── 00-00-00.png
│   └── 2024-01-16/
│       └── 08-00-00.png
└── sitio2/
    └── 2024-01-15/
        └── 08-00-00.png

reports/
├── report-2024-01-15T08-00-00.json
└── report-2024-01-15T16-00-00.json
```

## 📧 Configuración de Email

### Gmail (Recomendado)

1. Activa la verificación en 2 pasos en tu cuenta Gmail
2. Genera una "Contraseña de aplicación":
   - Ve a tu cuenta de Google → Seguridad
   - Verificación en 2 pasos → Contraseñas de aplicaciones
   - Selecciona "Correo" y "Otro" 
   - Copia la contraseña generada

```env
EMAIL_SERVICE=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=contraseña-de-aplicacion-de-16-digitos
```

### Otros Proveedores

```env
# Outlook
EMAIL_SERVICE=hotmail

# Yahoo
EMAIL_SERVICE=yahoo

# O configuración SMTP personalizada
EMAIL_HOST=smtp.tu-proveedor.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

## 🛠️ Comandos Disponibles

```bash
# Instalación completa
npm run setup

# Monitoreo continuo (3 veces al día)
npm start

# Una sola ejecución
npm start -- --once

# Prueba con Google
npm test

# Desarrollo con auto-recarga
npm run dev
```

## 📊 Reportes y Notificaciones

### Reporte de Email

Cada ciclo genera un email con:
- ✅ Resumen general (éxitos/fallos)
- 🚨 Lista detallada de sitios con problemas
- 📈 Estadísticas de rendimiento
- ⏱️ Tiempos de carga promedio

### Reportes JSON

Archivos detallados en `reports/` con:
- Timestamp completo
- Resultados por sitio
- Estadísticas de página
- Rutas de capturas
- Métricas de rendimiento

## 🔧 Personalización Avanzada

### Diferentes Tipos de Captura

```json
{
  "screenshotOptions": {
    "fullPage": false,           // Solo viewport visible
    "quality": 85,               // Calidad JPEG (1-100)
    "clip": {                    // Área específica
      "x": 0, "y": 0,
      "width": 800, "height": 600
    }
  }
}
```

### Selectores de Espera

```json
{
  "waitForSelector": ".contenido-principal",  // Elemento específico
  "waitForSelector": "img[src*='logo']",      // Logo cargado
  "waitForSelector": "[data-loaded='true']"   // Atributo personalizado
}
```

### Horarios Personalizados

Modifica directamente en `src/monitor.js`:

```javascript
// Cada 6 horas
cron.schedule('0 */6 * * *', () => { ... });

// Solo días laborables a las 9, 14 y 18 hrs
cron.schedule('0 9,14,18 * * 1-5', () => { ... });

// Cada 30 minutos
cron.schedule('*/30 * * * *', () => { ... });
```

## 🚨 Solución de Problemas

### Email no se envía

1. Verifica las credenciales en `.env`
2. Para Gmail, usa contraseña de aplicación
3. Revisa los logs del monitor

### Capturas fallan

1. Verifica que los sitios sean accesibles
2. Ajusta el `timeout` en `sites.json`
3. Revisa el `waitForSelector`

### Demasiadas capturas

```env
MAX_SCREENSHOTS_PER_SITE=5  # Reducir número
```

### Problemas de memoria

1. Reduce sitios simultáneos
2. Añade más pausa entre capturas en `monitor.js`:
   ```javascript
   await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
   ```

## 📈 Monitoreo para 30 Sitios

Para tu caso específico de ~30 sitios:

### Configuración Recomendada

```env
MONITOR_INTERVAL_HOURS=8      # 3 veces al día
MAX_SCREENSHOTS_PER_SITE=15   # ~5 días de historial
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080
SCREENSHOT_QUALITY=85         # Balancear calidad/tamaño
```

### Estimación de Espacio en Disco

- **Por captura:** ~200-500 KB (depende del sitio)
- **30 sitios × 3 capturas/día:** ~27-67 MB/día
- **Con 15 capturas por sitio:** ~810 MB - 2 GB total

### Tiempo de Ejecución

- **Por sitio:** ~10-20 segundos
- **30 sitios:** ~5-10 minutos por ciclo
- **3 ciclos/día:** ~15-30 minutos de uso diario

## 🔄 Automatización en Servidor

### PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar monitor
pm2 start src/monitor.js --name "website-monitor"

# Auto-inicio en reinicio del servidor
pm2 startup
pm2 save

# Monitorear
pm2 list
pm2 logs website-monitor
```

### Systemd (Linux)

```ini
# /etc/systemd/system/website-monitor.service
[Unit]
Description=Website Monitor
After=network.target

[Service]
Type=simple
User=tu-usuario
WorkingDirectory=/ruta/al/proyecto
ExecStart=/usr/bin/node src/monitor.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable website-monitor
sudo systemctl start website-monitor
```

## 🆘 Soporte

Si necesitas ayuda:
1. Revisa los logs de la consola
2. Verifica la configuración de `.env` y `sites.json`
3. Prueba con un solo sitio usando `npm test`
4. Asegúrate que Playwright esté instalado: `npx playwright install`

---

**¡Tu monitor está listo para vigilar tus 30 sitios web las 24 horas!** 🚀 
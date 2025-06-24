# 🚀 Guía de Deploy - Monitor Web 24/7

## 🥇 **Railway.app (RECOMENDADO)**

### **Paso 1: Preparar repositorio GitHub**

1. **Crear repositorio en GitHub:**
```bash
# En tu computadora, desde la carpeta del proyecto:
git init
git add .
git commit -m "Initial commit - Website Monitor"
git remote add origin https://github.com/tu-usuario/website-monitor.git
git push -u origin main
```

### **Paso 2: Deploy en Railway**

1. **Ir a Railway.app:**
   - Ve a https://railway.app
   - Regístrate con GitHub

2. **Crear nuevo proyecto:**
   - Click "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio `website-monitor`

3. **Configurar variables de entorno:**
   ```env
   MAILGUN_API_KEY=tu-api-key-de-mailgun
   MAILGUN_DOMAIN=mailer.ceosnew.media
   MAILGUN_TO=alan@ceosnm.com
   MONITOR_INTERVAL_HOURS=8
   MAX_SCREENSHOTS_PER_SITE=15
   ENABLE_EMAIL_NOTIFICATIONS=true
   FULL_PAGE_SCREENSHOTS=true
   VIEWPORT_WIDTH=1920
   VIEWPORT_HEIGHT=1080
   NODE_ENV=production
   
   # Opcional - Si tienes Cachet
   CACHET_URL=https://tu-cachet.com
   CACHET_API_TOKEN=tu-token
   ```

4. **Deploy automático:**
   - Railway detectará el `Dockerfile`
   - Build automático con Playwright
   - Deploy en ~3-5 minutos

### **Paso 3: Verificar funcionamiento**

Una vez deployado, tendrás una URL como: `https://website-monitor-production.up.railway.app`

**Endpoints disponibles:**
- `GET /` - Info general del servicio
- `GET /health` - Estado del monitor
- `GET /status` - Último reporte generado

## 🥈 **Render.com (Alternativa Gratuita)**

### **Configuración:**

1. **Ir a Render.com**
2. **Nuevo Web Service desde GitHub**
3. **Configuración:**
   ```
   Name: website-monitor
   Environment: Docker
   Build Command: npm run build
   Start Command: npm start
   ```

4. **Variables de entorno:** (Las mismas de Railway)

## 🥉 **DigitalOcean Droplet (Máximo Control)**

### **Configuración manual:**

```bash
# 1. Crear droplet Ubuntu 22.04 ($6/mes)
# 2. Conectar por SSH

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2

# Clonar repositorio
git clone https://github.com/tu-usuario/website-monitor.git
cd website-monitor

# Instalar dependencias
npm install
npx playwright install --with-deps

# Configurar variables de entorno
nano .env

# Iniciar con PM2
pm2 start src/monitor.js --name "website-monitor"
pm2 startup
pm2 save

# Configurar nginx (opcional)
sudo apt install nginx
# ... configuración de nginx
```

## 🏆 **Heroku (Deploy Clásico)**

```bash
# Instalar Heroku CLI
# heroku login

# En la carpeta del proyecto:
git init
heroku create tu-website-monitor

# Configurar buildpacks
heroku buildpacks:set heroku/nodejs
heroku buildpacks:add https://github.com/mxschmitt/heroku-playwright-buildpack.git

# Variables de entorno
heroku config:set MAILGUN_API_KEY=tu-api-key-de-mailgun
heroku config:set MAILGUN_DOMAIN=mailer.ceosnew.media
heroku config:set MAILGUN_TO=alan@ceosnm.com
# ... resto de variables

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## 📊 **Comparación de Opciones:**

| Plataforma | Costo/mes | Facilidad | Control | Recomendado |
|------------|-----------|-----------|---------|-------------|
| Railway    | $5        | ⭐⭐⭐⭐⭐    | ⭐⭐⭐⭐    | ✅ SÍ       |
| Render     | $0-7      | ⭐⭐⭐⭐     | ⭐⭐⭐      | ✅ Alternativa |
| DigitalOcean | $6      | ⭐⭐       | ⭐⭐⭐⭐⭐   | Para expertos |
| Heroku     | $7        | ⭐⭐⭐      | ⭐⭐       | No ideal |

## ⚡ **Configuración Rápida (Railway)**

Si quieres que te ayude a configurarlo:

1. **Crea cuenta en Railway.app**
2. **Sube tu código a GitHub**
3. **Conecta Railway con GitHub**
4. **Configura las variables de entorno**

**¡En 10 minutos tendrás tu monitor corriendo 24/7!**

## 🔍 **Monitoreo del Monitor**

Una vez deployado:

**📧 Emails automáticos cada 8 horas**
**🌐 Health check:** `https://tu-app.railway.app/health`
**📊 Estado actual:** `https://tu-app.railway.app/status`
**📱 Notificaciones:** Railway te avisa si algo falla

## 💰 **Costos Estimados:**

**Railway ($5/mes):**
- ✅ Monitor corriendo 24/7
- ✅ Capturas de 30 sitios, 3 veces al día
- ✅ Emails ilimitados via Mailgun
- ✅ Storage para capturas e historial
- ✅ SSL, logging, backup automático

**Total: $5/mes para monitoreo profesional de 30 sitios** 🚀 
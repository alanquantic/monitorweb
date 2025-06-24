# 🚀 Deploy en Vercel - Monitor Web

## ✅ **Vercel vs Railway - Comparación para tu caso:**

| Característica | Vercel | Railway |
|----------------|--------|---------|
| **Costo** | Ya lo tienes | $5/mes |
| **Cron Jobs** | ✅ Sí (Vercel Cron) | ✅ Nativo |
| **Playwright** | ⚠️ Limitado | ✅ Completo |
| **Persistencia** | ❌ No (serverless) | ✅ Sí |
| **Facilidad** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🎯 **Recomendación: Usar Vercel**

Ya que tienes Vercel Pro, es la mejor opción. He creado una versión serverless optimizada.

## 🚀 **Deploy en Vercel - Paso a Paso:**

### **1. Preparar el proyecto:**

Ya está listo con:
- ✅ `vercel.json` - Configuración de cron jobs
- ✅ `api/monitor.js` - Función serverless
- ✅ Dependencies optimizadas para Vercel

### **2. Variables de entorno en Vercel:**

Ve a tu dashboard de Vercel → Settings → Environment Variables:

```env
MAILGUN_API_KEY=tu-api-key-de-mailgun
MAILGUN_DOMAIN=mailer.ceosnew.media
MAILGUN_TO=alan@ceosnm.com

# Configuración de sitios (JSON string)
SITES_CONFIG=[{"id":"ceosnew-media","name":"CEOs New Media","url":"https://ceosnew.media/","enabled":true,"waitForSelector":"h1"}]

# Opcional - Cachet
CACHET_URL=
CACHET_API_TOKEN=
```

### **3. Deploy:**

```bash
# Opción A: Desde terminal
npx vercel --prod

# Opción B: Conectar GitHub repo
# 1. Push a GitHub
# 2. Importar desde Vercel dashboard
# 3. Deploy automático
```

### **4. Configurar Cron Job:**

El archivo `vercel.json` ya tiene configurado:
```json
{
  "crons": [
    {
      "path": "/api/monitor",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

**Esto ejecutará el monitor cada 8 horas automáticamente** 🎯

## 🔧 **Configuración de Sitios:**

Para agregar tus 30 sitios, modifica la variable `SITES_CONFIG` en Vercel:

```json
[
  {
    "id": "sitio1",
    "name": "Sitio 1",
    "url": "https://sitio1.com",
    "enabled": true,
    "waitForSelector": "header"
  },
  {
    "id": "sitio2", 
    "name": "Sitio 2",
    "url": "https://sitio2.com",
    "enabled": true,
    "waitForSelector": "h1"
  }
]
```

## ⚡ **URLs después del deploy:**

- **Monitor manual:** `https://tu-app.vercel.app/api/monitor`
- **Cron automático:** Cada 8 horas
- **Logs:** Vercel dashboard → Functions → monitor

## 🎉 **Ventajas de usar Vercel:**

1. ✅ **$0 costo adicional** (ya tienes Pro)
2. ✅ **Cron jobs nativos** con Vercel Cron
3. ✅ **Deploy automático** desde GitHub
4. ✅ **Escalado automático** sin configuración
5. ✅ **Logs integrados** en dashboard

## ⚠️ **Limitaciones de Vercel:**

1. **Execution timeout:** 5 minutos máximo por función
2. **Memory:** 1GB máximo
3. **Storage:** No persistente (pero no necesario)

**Para 30 sitios debería funcionar perfecto** ✅

## 🚀 **Pasos para empezar:**

1. **Configurar variables de entorno en Vercel**
2. **Deploy:** `npx vercel --prod`
3. **Probar manualmente:** `https://tu-app.vercel.app/api/monitor`
4. **Verificar cron:** Esperar 8 horas o ver logs

¿Quieres que procedamos con Vercel o prefieres Railway? 🤔

## 💡 **Mi recomendación:**

**Usa Vercel** ya que:
- No tienes costo adicional
- Ya conoces la plataforma  
- Es perfecto para tu caso de uso
- Tienes experiencia con su dashboard 
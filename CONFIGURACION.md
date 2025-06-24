# 🚀 Configuración Mailgun + Cachet

## 📧 Configuración de Mailgun (YA CONFIGURADO)

Tu configuración de Mailgun ya está lista:

```env
MAILGUN_API_KEY=tu-api-key-de-mailgun
MAILGUN_DOMAIN=mailer.ceosnew.media
MAILGUN_TO=tu-email-destino@gmail.com  # ← CAMBIAR por tu email
```

### ✅ Ventajas de Mailgun vs Gmail:
- **Confiabilidad:** 99.9% de entregabilidad
- **Volumen:** Hasta 10,000 emails gratis al mes
- **Velocidad:** Entrega instantánea
- **Tracking:** Reportes detallados de entrega
- **Sin límites:** No hay restricciones de Gmail

## 📊 Configuración de Cachet Status Page

[Cachet](https://docs.cachethq.io/api-reference/introduction) es una plataforma profesional para status pages como las que usan GitHub, Stripe, etc.

### Opciones para usar Cachet:

#### Opción 1: Cachet Cloud (Recomendado - Fácil)
1. Ve a https://cachethq.io
2. Crea una cuenta gratuita
3. Configura tu status page
4. Obtén tu URL y API token

#### Opción 2: Cachet Auto-hospedado
1. Instala Cachet en tu servidor con Docker:
```bash
docker run -d \
  --name=cachet \
  -p 8000:8000 \
  -e APP_KEY=base64:your-app-key \
  -e DB_DRIVER=sqlite \
  cachethq/docker
```

#### Opción 3: Usar solo el monitor (Sin Cachet)
Si no quieres usar Cachet ahora, simplemente deja vacías estas variables:
```env
CACHET_URL=
CACHET_API_TOKEN=
```

### 🔧 Configuración en .env

Una vez que tengas tu instancia de Cachet:

```env
# Ejemplo con Cachet Cloud
CACHET_URL=https://tuempresa.cachethq.io
CACHET_API_TOKEN=tu-token-api-de-cachet

# O con instalación propia
CACHET_URL=https://status.tudominio.com
CACHET_API_TOKEN=tu-token-api-de-cachet
```

## 🌐 Configuración de tus 30 sitios

Edita `config/sites.json` con tus sitios reales:

```json
{
  "sites": [
    {
      "id": "sitio-principal",
      "name": "Sitio Principal",
      "url": "https://tudominio1.com",
      "enabled": true,
      "waitForSelector": "header",
      "screenshotOptions": {
        "fullPage": true,
        "quality": 90,
        "format": "png"
      },
      "cachet": {
        "componentName": "Sitio Principal",
        "description": "Página principal de la empresa"
      }
    },
    {
      "id": "tienda-online",
      "name": "E-commerce",
      "url": "https://tienda.tudominio.com",
      "enabled": true,
      "waitForSelector": ".header",
      "screenshotOptions": {
        "fullPage": true,
        "quality": 90,
        "format": "png"
      },
      "cachet": {
        "componentName": "Tienda Online",
        "description": "Plataforma de e-commerce"
      }
    }
    // ... agregar tus otros 28 sitios
  ]
}
```

## ⚡ Configuración Rápida (Solo Mailgun)

Si quieres empezar solo con emails y agregar Cachet después:

1. **Edita tu email destino:**
```bash
nano .env
# Cambiar: MAILGUN_TO=tu-email-real@gmail.com
```

2. **Agrega tus sitios:**
```bash
nano config/sites.json
# Reemplaza los ejemplos con tus 30 sitios
```

3. **Ejecuta una prueba:**
```bash
npm start -- --once
```

## 🔄 Flujo de trabajo completo

Con ambas integraciones configuradas:

1. **Cada 8 horas** el monitor:
   - 📸 Toma capturas de tus 30 sitios
   - 📊 Actualiza estados en Cachet automáticamente
   - 📧 Envía reporte detallado por Mailgun
   - 🧹 Limpia capturas antiguas

2. **Si un sitio falla:**
   - 🚨 Crea incidente automático en Cachet
   - 📧 Email inmediato con alerta
   - 📸 Captura de pantalla del error (si es posible)

3. **Cuando se recupera:**
   - ✅ Marca incidente como resuelto en Cachet
   - 📧 Notificación de recuperación

## 📈 Para tus 30 sitios específicamente

### Configuración recomendada:

```env
MONITOR_INTERVAL_HOURS=8      # 3 veces al día (08:00, 16:00, 00:00)
MAX_SCREENSHOTS_PER_SITE=15   # ~5 días de historial
VIEWPORT_WIDTH=1920           # Resolución estándar
VIEWPORT_HEIGHT=1080
ENABLE_EMAIL_NOTIFICATIONS=true
```

### Estimaciones:
- **⏱️ Tiempo por ciclo:** 5-10 minutos para 30 sitios
- **📀 Espacio:** ~50-100 MB por día
- **📧 Emails:** 3 reportes diarios + alertas de incidentes
- **💰 Costo:** $0 (Mailgun: 10k emails gratis, Cachet: versión gratuita)

## 🚀 Próximos pasos

1. **Configura tu email en `.env`**
2. **Agrega tus sitios en `config/sites.json`**
3. **Ejecuta: `npm test`** (prueba con un sitio)
4. **Ejecuta: `npm start -- --once`** (prueba completa)
5. **Si funciona: `npm start`** (monitoreo continuo)

¡Tu sistema profesional de monitoreo estará listo en 5 minutos! 🎉 
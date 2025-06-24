import { chromium } from 'playwright-core';
import chromium_pkg from '@sparticuz/chromium';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import axios from 'axios';

// Configuración de Chromium para Vercel
const chromiumPack = chromium_pkg.default || chromium_pkg;

export default async function handler(req, res) {
  console.log('🚀 Iniciando monitoreo Grupo 2 (sitios 6-10)...');
  
  try {
    // Configurar Mailgun
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.mailgun.net'
    });

    // Sitios grupo 2 (6-10)
    const sitesGroup2 = [
      {
        "id": "loma-alta",
        "name": "Loma Alta",
        "url": "https://lomaalta.grupoemporium.mx/",
        "enabled": true,
        "waitForSelector": ".main, h1, header"
      },
      {
        "id": "andrea-emporium",
        "name": "Andrea Emporium",
        "url": "https://andrea.grupoemporium.mx/",
        "enabled": true,
        "waitForSelector": ".main, h1, header"
      },
      {
        "id": "morgan-online",
        "name": "Morgan Online",
        "url": "https://morganonline.com.mx/",
        "enabled": true,
        "waitForSelector": ".main, h1, header"
      },
      {
        "id": "brecmar",
        "name": "Brecmar",
        "url": "https://brecmar.com/",
        "enabled": true,
        "waitForSelector": ".main, h1, header"
      },
      {
        "id": "vivanta-emporium",
        "name": "Vivanta Emporium",
        "url": "https://vivanta.grupoemporium.mx/",
        "enabled": true,
        "waitForSelector": ".main, h1, header"
      }
    ];

    const results = [];
    
    // Configuración del browser para Vercel
    const browserConfig = {
      args: [
        ...chromiumPack.args,
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      executablePath: await chromiumPack.executablePath(),
      headless: chromiumPack.headless
    };

    // Procesar cada sitio con su propio browser
    for (const site of sitesGroup2.filter(s => s.enabled)) {
      let browser = null;
      try {
        console.log(`📸 Capturando ${site.name}...`);
        
        // Browser optimizado para Vercel
        browser = await chromium.launch(browserConfig);
        
        const context = await browser.newContext({
          viewport: { width: 1280, height: 720 }
        });
        
        const page = await context.newPage();
        const startTime = Date.now();
        
        await page.goto(site.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });

        // Selector más simple y rápido
        try {
          await page.waitForSelector('body', { timeout: 5000 });
        } catch (e) {
          console.log(`⚠️ No se encontró selector para ${site.name}, continuando...`);
        }

        await page.waitForTimeout(1000);
        const responseTime = Date.now() - startTime;

        // Capturar screenshot optimizado
        const screenshotBuffer = await page.screenshot({
          fullPage: false,
          type: 'png'
        });

        // Obtener estadísticas
        const stats = await page.evaluate(() => ({
          title: document.title,
          elementsCount: document.querySelectorAll('*').length,
          imagesCount: document.querySelectorAll('img').length,
          scriptsCount: document.querySelectorAll('script').length
        }));

        await context.close();
        await browser.close();

        results.push({
          success: true,
          site: site.name,
          url: site.url,
          timestamp: new Date().toLocaleString('es-ES'),
          stats: { ...stats, responseTime },
          screenshot: screenshotBuffer
        });

        console.log(`✅ ${site.name} capturado exitosamente (${responseTime}ms)`);

      } catch (error) {
        console.error(`❌ Error con ${site.name}:`, error.message);
        
        // Cerrar browser si existe para evitar memory leaks
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.log(`⚠️ Error cerrando browser para ${site.name}`);
          }
        }
        
        results.push({
          success: false,
          site: site.name,
          url: site.url,
          timestamp: new Date().toLocaleString('es-ES'),
          error: error.message
        });
      }
    }

    // Generar reporte
    const report = {
      timestamp: new Date().toLocaleString('es-ES'),
      group: "Grupo 2 (Sitios 6-10)",
      totalSites: sitesGroup2.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results.map(r => ({ ...r, screenshot: undefined })),
      summary: {
        uptime: results.length > 0 ? ((results.filter(r => r.success).length / results.length) * 100).toFixed(1) : "0"
      }
    };

    // Enviar email con Mailgun
    if (process.env.MAILGUN_DOMAIN && process.env.MAILGUN_TO) {
      const failedSites = results.filter(r => !r.success);
      const currentTime = new Date().toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City',
        hour12: true 
      });
      
      const subject = failedSites.length > 0 
        ? `🚨 Monitor Web ${currentTime} GRUPO 2 - ${failedSites.length} sitios con problemas`
        : `✅ Monitor Web ${currentTime} GRUPO 2 - Todos funcionando (${report.summary.uptime}% uptime)`;

      // Múltiples destinatarios
      const recipients = [
        process.env.MAILGUN_TO,
        'andres@ceosnm.com',
        'yarely@ceosnm.com', 
        'erik@ceosnm.com'
      ].filter(email => email).join(', ');

      const messageData = {
        from: `Monitor Web <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: recipients,
        subject: subject,
        html: generateEmailHTML(report, failedSites),
        attachment: []
      };

      // Agregar capturas como adjuntos
      results.forEach((result, index) => {
        if (result.success && result.screenshot) {
          const filename = `${result.site.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
          messageData.attachment.push({
            filename: filename,
            data: result.screenshot
          });
        }
      });

      // Agregar reporte JSON
      messageData.attachment.push({
        filename: `reporte_grupo2_${new Date().toISOString().split('T')[0]}.json`,
        data: Buffer.from(JSON.stringify(report, null, 2))
      });

      const emailResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
      console.log(`📧 Email Grupo 2 enviado: ${emailResponse.id}`);
    }

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Monitoreo Grupo 2 completado exitosamente',
      report: report
    });

  } catch (error) {
    console.error('❌ Error en monitoreo Grupo 2:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function generateEmailHTML(report, failedSites) {
  const timeZone = new Date().toLocaleString('es-MX', { 
    timeZone: 'America/Mexico_City',
    dateStyle: 'full',
    timeStyle: 'short'
  });
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
        📊 Reporte Monitor Web - GRUPO 2 (Sitios 6-10)
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">📈 Resumen Grupo 2</h3>
        <p><strong>📅 Fecha:</strong> ${timeZone}</p>
        <p><strong>🌐 Sitios grupo 2:</strong> ${report.totalSites}</p>
        <p><strong>✅ Funcionando:</strong> <span style="color: #28a745; font-weight: bold;">${report.successful}</span></p>
        <p><strong>❌ Con problemas:</strong> <span style="color: #dc3545; font-weight: bold;">${report.failed}</span></p>
        <p><strong>📊 Uptime grupo 2:</strong> <span style="color: ${report.summary.uptime >= 95 ? '#28a745' : '#dc3545'}; font-weight: bold; font-size: 18px;">${report.summary.uptime}%</span></p>
        <p style="color: #666; font-size: 14px;"><strong>👥 Destinatarios:</strong> alan@ceosnm.com, andres@ceosnm.com, yarely@ceosnm.com, erik@ceosnm.com</p>
      </div>

      ${failedSites.length > 0 ? `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">🚨 Sitios con Problemas</h3>
          ${failedSites.map(site => `
            <div style="margin-bottom: 10px; padding: 10px; background-color: white; border-radius: 3px;">
              <strong>${site.site}</strong><br>
              <small style="color: #666;">${site.url}</small><br>
              <span style="color: #dc3545;">Error: ${site.error}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #155724; margin-top: 0;">✅ Sitios Funcionando - Grupo 2</h3>
        ${report.results.filter(r => r.success).map(site => `
          <div style="margin-bottom: 5px;">
            <strong>${site.site}</strong> - 
            <span style="color: #28a745;">OK</span>
            ${site.stats?.responseTime ? ` (${site.stats.responseTime}ms)` : ''}
          </div>
        `).join('')}
      </div>

      <div style="background-color: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #0066cc; margin-top: 0;">📎 Adjuntos Grupo 2</h3>
        <p>📸 Capturas de pantalla de sitios funcionando</p>
        <p>📊 Reporte JSON con métricas del Grupo 2</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
        <small style="color: #6c757d;">
          Monitor Web Grupo 2 - Vercel + Mailgun - ${new Date().getFullYear()}
        </small>
      </div>
    </div>
  `;
} 
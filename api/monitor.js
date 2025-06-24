import { chromium } from 'playwright-core';
import chromium_pkg from '@sparticuz/chromium';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import axios from 'axios';

// Configuración de Chromium para Vercel
const chromiumPack = chromium_pkg.default || chromium_pkg;

// Simulación simple de fs-extra para Vercel
const reports = [];

export default async function handler(req, res) {
  console.log('🚀 Iniciando monitoreo serverless...');
  
  try {
    // Configurar Mailgun
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.mailgun.net'
    });

    // Sitios a monitorear (desde variables de entorno o hardcoded)
    const sites = JSON.parse(process.env.SITES_CONFIG || `[
      {
        "id": "ceosnew-media",
        "name": "CEOs New Media",
        "url": "https://ceosnew.media/",
        "enabled": true,
        "waitForSelector": "h1"
      }
    ]`);

    const results = [];
    
    // Inicializar navegador para Vercel
    const browser = await chromium.launch({
      args: chromiumPack.args,
      executablePath: await chromiumPack.executablePath(),
      headless: chromiumPack.headless
    });

    // Procesar cada sitio
    for (const site of sites.filter(s => s.enabled)) {
      try {
        console.log(`📸 Capturando ${site.name}...`);
        
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        const startTime = Date.now();
        
        await page.goto(site.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        if (site.waitForSelector) {
          await page.waitForSelector(site.waitForSelector, { timeout: 10000 });
        }

        await page.waitForTimeout(3000);
        const responseTime = Date.now() - startTime;

        // Capturar screenshot como base64 para email
        const screenshotBuffer = await page.screenshot({
          fullPage: true,
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
        results.push({
          success: false,
          site: site.name,
          url: site.url,
          timestamp: new Date().toLocaleString('es-ES'),
          error: error.message
        });
      }
    }

    await browser.close();

    // Generar reporte
    const report = {
      timestamp: new Date().toLocaleString('es-ES'),
      totalSites: sites.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results.map(r => ({ ...r, screenshot: undefined })), // Sin screenshot en JSON
      summary: {
        uptime: ((results.filter(r => r.success).length / results.length) * 100).toFixed(1)
      }
    };

    // Enviar email con Mailgun
    if (process.env.MAILGUN_DOMAIN && process.env.MAILGUN_TO) {
      const failedSites = results.filter(r => !r.success);
      const subject = failedSites.length > 0 
        ? `🚨 Monitor Web - ${failedSites.length} sitios con problemas`
        : `✅ Monitor Web - Todos funcionando (${report.summary.uptime}% uptime)`;

      const messageData = {
        from: `Monitor Web <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.MAILGUN_TO,
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
        filename: `reporte_${new Date().toISOString().split('T')[0]}.json`,
        data: Buffer.from(JSON.stringify(report, null, 2))
      });

      const emailResponse = await mg.messages.create(process.env.MAILGUN_DOMAIN, messageData);
      console.log(`📧 Email enviado: ${emailResponse.id}`);
    }

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Monitoreo completado exitosamente',
      report: report,
      executionTime: `${Date.now() - Date.now()}ms`
    });

  } catch (error) {
    console.error('❌ Error en monitoreo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function generateEmailHTML(report, failedSites) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        📊 Reporte de Monitoreo Web (Vercel)
      </h2>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #495057; margin-top: 0;">Resumen</h3>
        <p><strong>Fecha:</strong> ${report.timestamp}</p>
        <p><strong>Total de sitios:</strong> ${report.totalSites}</p>
        <p><strong>Exitosos:</strong> <span style="color: #28a745;">${report.successful}</span></p>
        <p><strong>Con problemas:</strong> <span style="color: #dc3545;">${report.failed}</span></p>
        <p><strong>Uptime:</strong> <span style="color: ${report.summary.uptime >= 95 ? '#28a745' : '#dc3545'};">${report.summary.uptime}%</span></p>
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
        <h3 style="color: #155724; margin-top: 0;">✅ Sitios Funcionando</h3>
        ${report.results.filter(r => r.success).map(site => `
          <div style="margin-bottom: 5px;">
            <strong>${site.site}</strong> - 
            <span style="color: #28a745;">OK</span>
            ${site.stats?.responseTime ? ` (${site.stats.responseTime}ms)` : ''}
          </div>
        `).join('')}
      </div>

      <div style="background-color: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #0066cc; margin-top: 0;">📎 Adjuntos Incluidos</h3>
        <p>📸 Capturas de pantalla de todos los sitios funcionando</p>
        <p>📊 Reporte JSON completo con métricas</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
        <small style="color: #6c757d;">
          Monitor Web con Vercel + Mailgun - ${new Date().getFullYear()}
        </small>
      </div>
    </div>
  `;
} 
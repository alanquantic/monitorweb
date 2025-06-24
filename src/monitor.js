import { chromium } from 'playwright';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
import cron from 'node-cron';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { CachetClient } from './cachet-client.js';
import healthApp from './health.js';

// Configuración
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebsiteMonitor {
  constructor() {
    this.sites = [];
    this.browser = null;
    this.mailgun = null;
    this.cachetClient = null;
    this.screenshotsDir = path.join(__dirname, '..', 'screenshots');
    this.reportsDir = path.join(__dirname, '..', 'reports');
    
    this.initializeDirectories();
    this.loadSites();
    this.setupMailgun();
    this.setupCachet();
  }

  async initializeDirectories() {
    await fs.ensureDir(this.screenshotsDir);
    await fs.ensureDir(this.reportsDir);
    console.log('📁 Directorios inicializados');
  }

  loadSites() {
    try {
      const sitesConfig = fs.readJsonSync(path.join(__dirname, '..', 'config', 'sites.json'));
      this.sites = sitesConfig.sites.filter(site => site.enabled);
      console.log(`🌐 Cargados ${this.sites.length} sitios para monitorear`);
    } catch (error) {
      console.error('❌ Error cargando configuración de sitios:', error.message);
      process.exit(1);
    }
  }

  setupMailgun() {
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const mailgun = new Mailgun(formData);
      this.mailgun = mailgun.client({
        username: 'api',
        key: process.env.MAILGUN_API_KEY,
        url: 'https://api.mailgun.net' // EU: 'https://api.eu.mailgun.net'
      });
      console.log('📧 Mailgun configurado correctamente');
    } else {
      console.log('⚠️ Mailgun no configurado - verifica MAILGUN_API_KEY y MAILGUN_DOMAIN');
    }
  }

  setupCachet() {
    if (process.env.CACHET_URL) {
      this.cachetClient = new CachetClient(
        process.env.CACHET_URL,
        process.env.CACHET_API_TOKEN || null
      );
      console.log('📊 Cliente Cachet inicializado');
    } else {
      console.log('⚠️ Cachet no configurado - verifica CACHET_URL');
    }
  }

  async initializeBrowser() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('🌐 Navegador iniciado');
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      console.log('🌐 Navegador cerrado');
    }
  }

  generateTimestamp() {
    const now = new Date();
    return {
      full: now.toISOString().replace(/[:.]/g, '-').split('.')[0],
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].replace(/:/g, '-'),
      readable: now.toLocaleString('es-ES')
    };
  }

  async captureScreenshot(site) {
    const timestamp = this.generateTimestamp();
    const siteDir = path.join(this.screenshotsDir, site.id);
    const dateDir = path.join(siteDir, timestamp.date);
    
    await fs.ensureDir(dateDir);

    const context = await this.browser.newContext({
      viewport: {
        width: parseInt(process.env.VIEWPORT_WIDTH) || 1920,
        height: parseInt(process.env.VIEWPORT_HEIGHT) || 1080
      }
    });

    const page = await context.newPage();
    
    try {
      console.log(`📸 Capturando ${site.name} (${site.url})`);
      
      const startTime = Date.now();
      
      // Navegar a la página
      await page.goto(site.url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Esperar elemento específico si está configurado
      if (site.waitForSelector) {
        await page.waitForSelector(site.waitForSelector, { timeout: 10000 });
      }

      // Esperar tiempo adicional para que cargue todo
      await page.waitForTimeout(3000);
      
      const responseTime = Date.now() - startTime;

      // Configurar opciones de captura
      const screenshotOptions = {
        path: path.join(dateDir, `${timestamp.time}.png`),
        fullPage: site.screenshotOptions?.fullPage ?? true,
        type: 'png'
      };

      // Solo agregar quality si el formato es JPEG
      if (site.screenshotOptions?.format === 'jpeg') {
        screenshotOptions.quality = site.screenshotOptions?.quality ?? 90;
        screenshotOptions.type = 'jpeg';
        screenshotOptions.path = path.join(dateDir, `${timestamp.time}.jpg`);
      }

      // Capturar screenshot
      await page.screenshot(screenshotOptions);

      // Obtener estadísticas básicas
      const stats = await this.getPageStats(page);
      stats.responseTime = responseTime;

      const result = {
        success: true,
        site: site.name,
        url: site.url,
        timestamp: timestamp.readable,
        screenshotPath: screenshotOptions.path,
        stats
      };

      // Sincronizar con Cachet si está configurado
      if (this.cachetClient) {
        await this.cachetClient.syncSiteStatus(site.name, true, responseTime);
      }

      console.log(`✅ Captura exitosa: ${site.name} (${responseTime}ms)`);
      return result;

    } catch (error) {
      console.error(`❌ Error capturando ${site.name}:`, error.message);
      
      const result = {
        success: false,
        site: site.name,
        url: site.url,
        timestamp: timestamp.readable,
        error: error.message
      };

      // Sincronizar error con Cachet si está configurado
      if (this.cachetClient) {
        await this.cachetClient.syncSiteStatus(site.name, false, null, error.message);
      }

      return result;
    } finally {
      await context.close();
    }
  }

  async getPageStats(page) {
    try {
      const stats = await page.evaluate(() => {
        return {
          title: document.title,
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          elementsCount: document.querySelectorAll('*').length,
          imagesCount: document.querySelectorAll('img').length,
          scriptsCount: document.querySelectorAll('script').length,
          stylesheetsCount: document.querySelectorAll('link[rel="stylesheet"]').length,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        };
      });
      return stats;
    } catch (error) {
      return { error: 'No se pudieron obtener estadísticas' };
    }
  }

  async cleanOldScreenshots() {
    const maxScreenshots = parseInt(process.env.MAX_SCREENSHOTS_PER_SITE) || 10;
    
    for (const site of this.sites) {
      const siteDir = path.join(this.screenshotsDir, site.id);
      
      if (await fs.pathExists(siteDir)) {
        const dateDirs = await fs.readdir(siteDir);
        
        for (const dateDir of dateDirs) {
          const datePath = path.join(siteDir, dateDir);
          const screenshots = await fs.readdir(datePath);
          
          if (screenshots.length > maxScreenshots) {
            // Ordenar por fecha y eliminar los más antiguos
            const sortedScreenshots = screenshots
              .map(file => ({
                name: file,
                path: path.join(datePath, file),
                stat: fs.statSync(path.join(datePath, file))
              }))
              .sort((a, b) => a.stat.mtime - b.stat.mtime);

            const toDelete = sortedScreenshots.slice(0, screenshots.length - maxScreenshots);
            
            for (const file of toDelete) {
              await fs.remove(file.path);
            }
            
            console.log(`🧹 Limpiadas ${toDelete.length} capturas antiguas de ${site.name}`);
          }
        }
      }
    }
  }

  async generateReport(results) {
    const timestamp = this.generateTimestamp();
    const reportPath = path.join(this.reportsDir, `report-${timestamp.full}.json`);
    
    const report = {
      timestamp: timestamp.readable,
      totalSites: this.sites.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results,
      summary: {
        successRate: `${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`,
        averageLoadTime: this.calculateAverageLoadTime(results),
        uptime: ((results.filter(r => r.success).length / results.length) * 100).toFixed(1)
      }
    };

    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(`📊 Reporte generado: ${reportPath}`);
    
    // Generar reporte para Cachet si está configurado
    if (this.cachetClient) {
      const cachetReport = await this.cachetClient.generateStatusReport(results);
      if (cachetReport) {
        report.cachetReport = cachetReport;
      }
    }
    
    return report;
  }

  calculateAverageLoadTime(results) {
    const successfulResults = results.filter(r => r.success && r.stats && r.stats.responseTime);
    if (successfulResults.length === 0) return 'N/A';
    
    const totalTime = successfulResults.reduce((sum, r) => sum + r.stats.responseTime, 0);
    return `${(totalTime / successfulResults.length).toFixed(0)}ms`;
  }

  async sendMailgunReport(report) {
    if (!this.mailgun || !process.env.MAILGUN_DOMAIN || !process.env.MAILGUN_TO) {
      console.log('⚠️ Mailgun no configurado completamente');
      return;
    }

    const failedSites = report.results.filter(r => !r.success);
    const subject = failedSites.length > 0 
      ? `🚨 Monitor Web - ${failedSites.length} sitios con problemas`
      : `✅ Monitor Web - Todos los sitios funcionando (${report.summary.uptime}% uptime)`;

    const htmlContent = this.generateEmailHTML(report, failedSites);

    try {
      const messageData = {
        from: `Monitor Web <noreply@${process.env.MAILGUN_DOMAIN}>`,
        to: process.env.MAILGUN_TO,
        subject: subject,
        html: htmlContent,
        text: this.generateEmailText(report, failedSites),
        attachment: []
      };

      // Agregar capturas de pantalla como adjuntos
      for (const result of report.results) {
        if (result.success && result.screenshotPath && await fs.pathExists(result.screenshotPath)) {
          const filename = `${result.site.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
          
          messageData.attachment.push({
            filename: filename,
            data: await fs.readFile(result.screenshotPath)
          });
          
          console.log(`📎 Adjuntando captura: ${filename}`);
        }
      }

      // También adjuntar reporte JSON
      const reportFilename = `reporte_${new Date().toISOString().split('T')[0]}.json`;
      messageData.attachment.push({
        filename: reportFilename,
        data: Buffer.from(JSON.stringify(report, null, 2))
      });

      const response = await this.mailgun.messages.create(process.env.MAILGUN_DOMAIN, messageData);
      console.log(`📧 Email enviado exitosamente via Mailgun con ${messageData.attachment.length} adjuntos (ID: ${response.id})`);
    } catch (error) {
      console.error('❌ Error enviando email con Mailgun:', error.message);
    }
  }

  generateEmailHTML(report, failedSites) {
    const cachetSection = this.cachetClient ? `
      <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #1565c0; margin-top: 0;">📊 Status Page</h3>
        <p>Revisa el estado completo en tiempo real en tu Cachet Status Page.</p>
        ${process.env.CACHET_URL ? `<a href="${process.env.CACHET_URL}" style="color: #1565c0;">Ver Status Page →</a>` : ''}
      </div>
    ` : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📊 Reporte de Monitoreo Web
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Resumen</h3>
          <p><strong>Fecha:</strong> ${report.timestamp}</p>
          <p><strong>Total de sitios:</strong> ${report.totalSites}</p>
          <p><strong>Exitosos:</strong> <span style="color: #28a745;">${report.successful}</span></p>
          <p><strong>Con problemas:</strong> <span style="color: #dc3545;">${report.failed}</span></p>
          <p><strong>Uptime:</strong> <span style="color: ${report.summary.uptime >= 95 ? '#28a745' : '#dc3545'};">${report.summary.uptime}%</span></p>
          <p><strong>Tiempo promedio de respuesta:</strong> ${report.summary.averageLoadTime}</p>
        </div>

        ${cachetSection}

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
              ${site.stats && site.stats.responseTime ? ` (${site.stats.responseTime}ms)` : ''}
            </div>
          `).join('')}
        </div>

        <div style="background-color: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0066cc; margin-top: 0;">📎 Adjuntos Incluidos</h3>
          <p>Este email incluye:</p>
          <ul>
            <li>📸 <strong>Capturas de pantalla</strong> de todos los sitios funcionando</li>
            <li>📊 <strong>Reporte JSON completo</strong> con todas las métricas</li>
          </ul>
          <p><small>Las capturas están optimizadas y muestran el estado actual de cada sitio web.</small></p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <small style="color: #6c757d;">
            Monitor Web Automático con Mailgun + Cachet - ${new Date().getFullYear()}
          </small>
        </div>
      </div>
    `;
  }

  generateEmailText(report, failedSites) {
    return `
Monitor Web - Reporte ${report.timestamp}

RESUMEN:
- Total de sitios: ${report.totalSites}
- Exitosos: ${report.successful}
- Con problemas: ${report.failed}
- Uptime: ${report.summary.uptime}%
- Tiempo promedio: ${report.summary.averageLoadTime}

${failedSites.length > 0 ? `
SITIOS CON PROBLEMAS:
${failedSites.map(site => `- ${site.site} (${site.url}): ${site.error}`).join('\n')}
` : ''}

SITIOS FUNCIONANDO:
${report.results.filter(r => r.success).map(site => `- ${site.site}: OK${site.stats?.responseTime ? ` (${site.stats.responseTime}ms)` : ''}`).join('\n')}

Monitor Web Automático
    `;
  }

  async runMonitoring() {
    console.log('\n🚀 Iniciando ciclo de monitoreo...');
    console.log(`📅 ${this.generateTimestamp().readable}`);
    console.log(`🌐 Monitoreando ${this.sites.length} sitios\n`);

    await this.initializeBrowser();

    const results = [];
    
    // Procesar sitios secuencialmente para evitar sobrecargar
    for (const site of this.sites) {
      const result = await this.captureScreenshot(site);
      results.push(result);
      
      // Pausa entre capturas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await this.closeBrowser();

    // Limpiar capturas antiguas
    await this.cleanOldScreenshots();

    // Generar reporte
    const report = await this.generateReport(results);

    // Enviar email con Mailgun si está habilitado
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      await this.sendMailgunReport(report);
    }

    console.log('\n✅ Ciclo de monitoreo completado');
    console.log(`📊 Exitosos: ${report.successful}/${report.totalSites}`);
    console.log(`📈 Uptime: ${report.summary.uptime}%`);
    if (this.cachetClient) {
      console.log(`📊 Estado sincronizado con Cachet`);
    }
    console.log();

    return report;
  }

  startScheduledMonitoring() {
    const intervalHours = parseInt(process.env.MONITOR_INTERVAL_HOURS) || 8;
    
    // Ejecutar inmediatamente
    this.runMonitoring();

    // Programar ejecuciones (3 veces al día = cada 8 horas)
    cron.schedule(`0 */${intervalHours} * * *`, () => {
      console.log('\n⏰ Ejecutando monitoreo programado...');
      this.runMonitoring();
    });

    console.log(`⏰ Monitoreo programado cada ${intervalHours} horas`);
    console.log('🔄 El monitor seguirá ejecutándose automáticamente...');
  }
}

// Función principal
async function main() {
  try {
    const monitor = new WebsiteMonitor();
    
    // Verificar si es ejecución única o programada
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
      console.log('🔄 Ejecutando monitoreo una sola vez...');
      await monitor.runMonitoring();
      process.exit(0);
    } else {
      console.log('🔄 Iniciando monitoreo programado...');
      
      // Iniciar servidor de health check en modo cloud
      if (process.env.NODE_ENV === 'production' || process.env.PORT) {
        const PORT = process.env.PORT || 3000;
        healthApp.listen(PORT, () => {
          console.log(`🌐 Health server corriendo en puerto ${PORT}`);
        });
      }
      
      monitor.startScheduledMonitoring();
    }
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Manejo de señales del sistema
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo monitor...');
  process.exit(0);
});

main(); 
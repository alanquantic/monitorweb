import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSingleSite() {
  console.log('🧪 Prueba de captura individual\n');
  
  // Configuración de prueba
  const testSite = {
    id: 'test',
    name: 'Example.com (Prueba)',
    url: 'https://example.com',
    waitForSelector: 'h1'
  };

  const screenshotsDir = path.join(__dirname, '..', 'screenshots', 'test');
  await fs.ensureDir(screenshotsDir);

  console.log(`📸 Probando captura de: ${testSite.name}`);
  console.log(`🌐 URL: ${testSite.url}\n`);

  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    console.log('⏳ Navegando a la página...');
    await page.goto(testSite.url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    console.log('⏳ Esperando elemento específico...');
    await page.waitForSelector(testSite.waitForSelector, { timeout: 10000 });
    
    console.log('⏳ Esperando tiempo adicional...');
    await page.waitForTimeout(3000);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const screenshotPath = path.join(screenshotsDir, `test-${timestamp}.png`);

    console.log('📸 Capturando screenshot...');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Obtener estadísticas
    const stats = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        elementsCount: document.querySelectorAll('*').length,
        imagesCount: document.querySelectorAll('img').length
      };
    });

    console.log('\n✅ ¡Captura exitosa!');
    console.log(`📁 Guardado en: ${screenshotPath}`);
    console.log(`📊 Título: ${stats.title}`);
    console.log(`📊 Elementos: ${stats.elementsCount}`);
    console.log(`📊 Imágenes: ${stats.imagesCount}`);
    console.log(`📊 Viewport: ${stats.viewport.width}x${stats.viewport.height}`);

    await context.close();

  } catch (error) {
    console.error('\n❌ Error en la captura:', error.message);
  } finally {
    await browser.close();
    console.log('\n🌐 Navegador cerrado');
  }
}

testSingleSite(); 
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const failedRequests = [];
  const imageRequests = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('uploads') || url.includes('6a6ffb1b')) {
      imageRequests.push({ url, status: response.status(), headers: response.headers() });
    }
    if (!response.ok() && (url.includes('uploads') || url.includes('havento'))) {
      failedRequests.push({ url, status: response.status() });
    }
  });

  await page.goto('https://havento.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('=== ALL uploads/image-related requests ===');
  console.log(JSON.stringify(imageRequests, null, 2));

  console.log('=== FAILED requests (non-2xx) ===');
  console.log(JSON.stringify(failedRequests, null, 2));

  const imgSrcs = await page.$$eval('img', imgs => imgs.map(i => ({alt: i.alt, src: i.src, naturalWidth: i.naturalWidth})));
  console.log('=== Rendered <img> elements ===');
  console.log(JSON.stringify(imgSrcs, null, 2));

  await browser.close();
})();

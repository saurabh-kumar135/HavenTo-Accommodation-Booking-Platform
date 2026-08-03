const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let hostHomesResponse = null;
  let requestHeaders = null;

  page.on('request', (req) => {
    if (req.url().includes('/api/host/host-home-list')) {
      requestHeaders = req.headers();
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/host/host-home-list')) {
      hostHomesResponse = { status: res.status(), body: await res.json().catch(() => null) };
    }
  });

  await page.goto('https://havento.vercel.app', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Log in as host using host account testni123@gmail.com
  await page.click('text=Login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'testni123@gmail.com');
  await page.fill('input[type="password"]', 'crudAbc@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Go to Host Homes
  await page.click('text=Host Homes');
  await page.waitForTimeout(3000);

  console.log('=== Request headers sent to /api/host/host-home-list ===');
  console.log(JSON.stringify(requestHeaders, null, 2));

  console.log('=== Response from /api/host/host-home-list ===');
  console.log(JSON.stringify(hostHomesResponse, null, 2));

  await browser.close();
})();

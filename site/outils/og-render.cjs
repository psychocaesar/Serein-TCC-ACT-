const { chromium } = require(process.env.HOME + '/serein/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 600, height: 315 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:8794/relais/og.html');
  await p.waitForTimeout(800);
  await p.screenshot({ path: process.argv[2] });
  await b.close();
})();

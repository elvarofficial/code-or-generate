// Article cards: render lib/cards.html and save each card as a PNG (2x).
// Run: node cards.js
import fs from "node:fs";
import { chromium } from "playwright";
import { serve } from "./lib/serve.js";

fs.mkdirSync("article", { recursive: true });
const { url, close } = await serve(process.cwd());
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await page.goto(`${url}/lib/cards.html`);
await page.waitForFunction(() => window.ready === true);
await page.evaluate(() => document.fonts.ready);
for (const id of ["chart", "cost", "rules", "rule", "request", "sheets", "table", "table2", "table3"]) {
  await page.locator(`#${id}`).screenshot({ path: `article/card-${id}.png` });
  console.log(`article/card-${id}.png`);
}
await browser.close();
close();

// link preview for the live page, 1200 x 630 at 1x
{
  const b = await (await import("playwright")).chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const s = await serve(process.cwd());
  await p.goto(`${s.url}/lib/cards.html`);
  await p.waitForFunction(() => window.ready === true);
  await p.evaluate(() => document.fonts.ready);
  await p.locator("#og img").evaluate((img) => img.decode());
  await p.locator("#og").screenshot({ path: "site/og.jpg", type: "jpeg", quality: 90 });
  console.log("site/og.jpg");
  await b.close();
  s.close();
}

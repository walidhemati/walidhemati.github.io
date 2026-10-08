import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { builtPages, slugOf, SCREENS } from './pages';

mkdirSync(SCREENS, { recursive: true });

const WIDTHS = [375, 768, 1440] as const;
const THEMES = ['light', 'dark'] as const;

/** Walk the page so scroll-triggered reveals fire, then return to the top. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.max(200, Math.floor(innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 600));
  });
}

/**
 * Full-page captures paint position:fixed layers only over the first viewport, which leaves a
 * visible seam in the grain. Stretch the grain over the whole document for the capture only.
 */
async function fullPageGrain(page: Page) {
  await page.addStyleTag({ content: 'body{position:relative} body::after{position:absolute !important;inset:0 !important}' });
}

for (const path of builtPages()) {
  const slug = slugOf(path);
  for (const w of WIDTHS) {
    for (const theme of THEMES) {
      test(`screen ${slug} ${w} ${theme}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 812 : 900 }, colorScheme: theme });
        const page = await ctx.newPage();
        await page.goto(path, { waitUntil: 'networkidle' });
        if (slug === 'home') {
          await page.waitForTimeout(4000); // hero detection pass settles ~3.1 s
          await page.screenshot({ path: join(SCREENS, `${slug}-hero-${w}-${theme}.png`) });
        }
        await settle(page);
        await fullPageGrain(page);
        await page.screenshot({ path: join(SCREENS, `${slug}-${w}-${theme}.png`), fullPage: true });
        await ctx.close();
      });
    }
  }
}

for (const w of WIDTHS) {
  test(`screen home reduced-motion ${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 800 ? 812 : 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await fullPageGrain(page);
    await page.screenshot({ path: join(SCREENS, `home-reduced-${w}-light.png`), fullPage: true });
    await ctx.close();
  });
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { builtPages, DIST } from './pages';

const PAGES = builtPages();
/** Other repos served under walidhemati.github.io (verified live separately). */
const SIBLING_PROJECTS = ['/flatsnap-privacy/'];
const THEMES = ['light', 'dark'] as const;

// ---------- axe + console errors, per page / width / theme ----------
for (const path of PAGES) {
  for (const w of [375, 1440]) {
    for (const theme of THEMES) {
      test(`axe+console ${path} ${w} ${theme}`, async ({ browser }) => {
        const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: theme });
        const page = await ctx.newPage();
        const errors: string[] = [];
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(String(e)));
        const external: string[] = [];
        page.on('request', (r) => {
          const u = new URL(r.url());
          if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url());
        });
        await page.goto(path, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
        const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
        expect(errors).toEqual([]);
        expect(external).toEqual([]);
        await ctx.close();
      });
    }
  }
}

// ---------- no horizontal scroll at 360 px ----------
for (const path of PAGES) {
  test(`no h-scroll 360 ${path}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw, `${path} scrollWidth ${sw} > ${cw}`).toBeLessThanOrEqual(cw);
    await ctx.close();
  });
}

// ---------- content visible with JS disabled ----------
for (const path of PAGES) {
  test(`no-js visible ${path}`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(path, { waitUntil: 'load' });
    const hidden = await page.evaluate(() => {
      const out: string[] = [];
      const main = document.querySelector('main');
      if (!main) return ['no <main>'];
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        const t = n.textContent?.trim();
        if (!t) continue;
        let el = n.parentElement;
        // skip content intentionally hidden (sr-only copies, aria-hidden decoration, closed dialogs, no-JS-hidden controls)
        if (el?.closest('[aria-hidden="true"],[hidden],dialog:not([open]),template,noscript,.sr-only,.visually-hidden,script,style')) continue;
        let opacity = 1;
        let vis = true;
        for (let e: Element | null = el; e; e = e.parentElement) {
          const cs = getComputedStyle(e);
          opacity *= Number(cs.opacity);
          if (cs.display === 'none') { vis = true; opacity = 1; break; } // display:none is a deliberate omission
          if (cs.visibility === 'hidden') vis = false;
        }
        if (!vis || opacity < 0.05) out.push(t.slice(0, 60));
      }
      return out;
    });
    expect(hidden).toEqual([]);
    await ctx.close();
  });
}

// ---------- every internal link resolves ----------
test('internal links resolve', async () => {
  const htmlFiles: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (n.endsWith('.html')) htmlFiles.push(p);
    }
  };
  walk(DIST);
  const idsOf = (file: string) => new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const resolve = (pathname: string) => {
    const p = decodeURIComponent(pathname);
    const cands = [join(DIST, p), join(DIST, p, 'index.html'), join(DIST, p + '.html')];
    return cands.find((c) => existsSync(c) && statSync(c).isFile());
  };
  const broken: string[] = [];
  let checked = 0;
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    const pagePath = '/' + f.slice(DIST.length + 1).replace(/index\.html$/, '');
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const raw = m[1].replace(/&amp;/g, '&');
      if (/^(mailto:|tel:|data:|javascript:)/.test(raw)) continue;
      const u = new URL(raw, `https://walidhemati.github.io${pagePath}`);
      if (u.hostname !== 'walidhemati.github.io') continue;
      // Sibling GitHub Pages project repos share the domain but are not part of this build.
      if (SIBLING_PROJECTS.some((p) => u.pathname.startsWith(p))) continue;
      checked++;
      const target = resolve(u.pathname);
      if (!target) { broken.push(`${pagePath} -> ${raw}`); continue; }
      if (u.hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(u.hash.slice(1)))) broken.push(`${pagePath} -> ${raw} (missing #id)`);
    }
  }
  console.log(`links: ${checked} internal references checked`);
  expect(broken).toEqual([]);
});

// ---------- home: JS gzip size + CLS ----------
test('home JS gzip size', async ({ page }) => {
  const js = new Map<string, number>();
  page.on('response', async (r) => {
    if (r.url().endsWith('.js') || r.request().resourceType() === 'script') {
      try { js.set(r.url(), gzipSync(await r.body()).length); } catch { /* inline / no body */ }
    }
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
  await page.waitForTimeout(1000);
  const inline = await page.evaluate(() => [...document.querySelectorAll('script:not([src])')].filter((s) => !(s as HTMLScriptElement).type.includes('json')).map((s) => s.textContent ?? '').join('\n'));
  const total = [...js.values()].reduce((a, b) => a + b, 0) + gzipSync(inline).length;
  console.log(`home JS gzip: ${(total / 1024).toFixed(1)} KB across ${js.size} files + inline ${(gzipSync(inline).length / 1024).toFixed(1)} KB`);
  expect(total).toBeLessThan(60 * 1024);
});

test('home CLS', async ({ browser }) => {
  for (const w of [375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      (window as any).__cls = 0;
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4500);
    const cls = await page.evaluate(() => (window as any).__cls as number);
    console.log(`home CLS @${w}: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(0.1);
    await ctx.close();
  }
});

// ---------- dist greps: CDNs + private data shapes ----------
test('dist has no CDN refs and no private-data shapes', async () => {
  const CDN = /googleapis|gstatic|unpkg|jsdelivr|cdnjs|typekit|googletagmanager|google-analytics/i;
  const PRIVATE = /whatsapp|nationality|date of birth|geburtsdatum|staatsangeh|\+90[\s\d]{6,}|\b\d{2}\/\d{2}\/(19|20)\d{2}\b/i;
  const hits: string[] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (['.html', '.css', '.js', '.xml', '.txt', '.json', '.svg'].includes(extname(p))) {
        const s = readFileSync(p, 'utf8');
        const c = s.match(CDN); if (c) hits.push(`${p}: cdn ${c[0]}`);
        const q = s.match(PRIVATE); if (q) hits.push(`${p}: private ${q[0]}`);
      }
    }
  };
  walk(DIST);
  expect(hits).toEqual([]);
});

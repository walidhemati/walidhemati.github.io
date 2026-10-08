#!/usr/bin/env node
/**
 * Generates the scrubbed CV PDFs from the HTML CV (plan 5.1, 7.3):
 *   public/cv.pdf            (linked from /cv/)
 *   public/personal/CV.pdf   (same file at the old URL, so old links keep working)
 *
 * Usage (after a build):
 *   npx astro build && node scripts/cv-pdf.mjs [distDir=dist]
 *   then build again so the new PDFs are copied into dist/.
 *
 * It serves the built site on a local port (fonts are root-relative), opens
 * /cv/ in Chromium with print media, and prints A4. It also refuses to write a
 * PDF whose text contains anything that looks like a phone number or a date of
 * birth, as a last privacy guard (the CV must never carry them).
 */
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.resolve(root, process.argv[2] ?? 'dist');
const outs = [path.join(root, 'public/cv.pdf'), path.join(root, 'public/personal/CV.pdf')];

if (!fs.existsSync(path.join(dist, 'cv/index.html'))) {
  console.error(`cv-pdf: ${dist}/cv/index.html not found. Build the site first.`);
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

const server = http
  .createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    let file = path.normalize(path.join(dist, p));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    if (p.endsWith('/')) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const external = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(`http://127.0.0.1:${port}`) && !r.url().startsWith('data:')) external.push(r.url());
  });
  await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(`http://127.0.0.1:${port}/cv/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // Privacy guard on the rendered text (generic patterns only; no real values in this file)
  const text = await page.evaluate(() => document.body.innerText);
  const bad = [
    [/\+\d{2}[\d\s()-]{7,}/, 'phone number'],
    [/whats\s*app/i, 'WhatsApp'],
    [/\b(date of birth|geburtsdatum|nationality|staatsangehörigkeit)\b/i, 'personal data label'],
    [/\b\d{2}[./]\d{2}[./](19|20)\d{2}\b/, 'full date (possible date of birth)'],
  ].filter(([re]) => re.test(text));
  if (bad.length) throw new Error(`cv-pdf: refusing to write, found ${bad.map((b) => b[1]).join(', ')}`);
  if (external.length) throw new Error(`cv-pdf: external requests during render: ${external.join(', ')}`);

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true,
    outline: true,
  });
  for (const out of outs) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, pdf);
    console.log(`cv-pdf: wrote ${path.relative(root, out)} (${(pdf.length / 1024).toFixed(1)} KB)`);
  }
} finally {
  await browser.close();
  server.close();
}

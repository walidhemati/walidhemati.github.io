// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import fs from 'node:fs';

const SITE = 'https://walidhemati.github.io';

// Pages that must never appear in the sitemap (plan section 5.2).
const EXCLUDE = [/\/impressum\/?$/, /\/404(\.html|\/)?$/, /\/personal\//];

// /now/ stays out of the sitemap while its newest entry is still a draft.
const nowDir = new URL('./src/content/now/', import.meta.url);
const newestNow = fs
  .readdirSync(nowDir)
  .filter((f) => /\.mdx?$/.test(f))
  .sort()
  .at(-1);
if (newestNow && /^draft:\s*true\s*$/m.test(fs.readFileSync(new URL(newestNow, nowDir), 'utf8'))) {
  EXCLUDE.push(/^\/now\/?$/);
}

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !EXCLUDE.some((re) => re.test(new URL(page).pathname)),
    }),
  ],
  vite: {
    build: {
      // Never inline fonts as data: URIs (the hero subset must be a preloadable file).
      assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
    },
  },
  devToolbar: { enabled: false },
});

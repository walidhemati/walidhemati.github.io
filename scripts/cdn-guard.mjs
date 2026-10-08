#!/usr/bin/env node
// Zero-third-party-requests guard (plan 6.3): fail if dist/ references a CDN.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const BANNED = /googleapis|gstatic|unpkg|jsdelivr|cdnjs|fonts\.bunny|use\.typekit|googletagmanager|google-analytics/i;
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.svg', '.txt', '.webmanifest']);

const hits = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (TEXT.has(extname(p))) {
      readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
        const m = line.match(BANNED);
        if (m) hits.push(`${p}:${i + 1}: ${m[0]}`);
      });
    }
  }
};
walk(DIST);
if (hits.length) {
  console.error(`CDN guard: ${hits.length} third-party reference(s) in ${DIST}/\n${hits.join('\n')}`);
  process.exit(1);
}
console.log(`CDN guard: OK, no third-party hosts in ${DIST}/`);

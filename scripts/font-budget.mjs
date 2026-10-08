#!/usr/bin/env node
// Font budget (plan 3.1 / 6.3): all woff2 in dist/ must total ≤ 130 KB.
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const BUDGET = 130 * 1024;
let total = 0;
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (extname(p) === '.woff2') {
      total += s.size;
      files.push(`${(s.size / 1024).toFixed(1).padStart(6)} KB  ${p}`);
    }
  }
};
walk(DIST);
console.log(files.join('\n'));
console.log(`Fonts total: ${(total / 1024).toFixed(1)} KB (budget ${BUDGET / 1024} KB)`);
if (total > BUDGET) process.exit(1);

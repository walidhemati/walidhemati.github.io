import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const DIST = join(process.cwd(), 'dist');

/** Every built HTML page except the /personal/ redirect stubs, as URL paths. */
export function builtPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) {
        const rel = relative(DIST, p).split(sep).join('/');
        if (rel.startsWith('personal/')) continue;
        out.push('/' + rel.replace(/index\.html$/, ''));
      }
    }
  };
  walk(DIST);
  return out.sort();
}

/** "/work/pylbm/" -> "work-pylbm", "/" -> "home", "/404.html" -> "404". */
export const slugOf = (path: string) =>
  path === '/' ? 'home' : path.replace(/\.html$/, '').replace(/^\/|\/$/g, '').replace(/\//g, '-');

export const SCREENS = process.env.SCREENS_DIR ?? join(process.cwd(), 'test-results', 'screens');

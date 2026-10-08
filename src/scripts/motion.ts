/**
 * Motion entry point (plan 4.1 #2, 4.3, 4.6). SINGLE entry, loaded by Base.astro.
 *
 * Contract:
 *  - html.motion-ready is set once motion has initialised. The inline prefs
 *    script removes html.js-motion after 3s if motion-ready is still missing,
 *    so a failed or slow load never hides content.
 *  - On the home page ([data-home]) the GSAP chunk (home.ts) is imported
 *    lazily, so inner pages never download GSAP. motion-ready is set after the
 *    home chunk has initialised; if it fails, js-motion is dropped at once.
 *  - All decorative work happens only when BOTH keys allow motion
 *    (OS prefers-reduced-motion AND the site toggle, html[data-motion]).
 */
import { initReveal } from './reveal';
import { initCopy } from './copy';

const root = document.documentElement;
const ready = () => root.classList.add('motion-ready');

initCopy();

let teardownReveal = initReveal();
window.addEventListener('wh:motionchange', () => {
  teardownReveal();
  teardownReveal = initReveal();
});

if (document.querySelector('[data-home]')) {
  import('./home')
    .then((m) => m.initHome())
    .then(ready)
    .catch((err) => {
      // Never leave start states applied when the motion layer could not load
      root.classList.remove('js-motion');
      ready();
      if (import.meta.env.DEV) console.error(err);
    });
} else {
  ready();
}

/**
 * Home motion layer (plan 4.3, 4.4 #3–#13, 4.6). Lazily imported by motion.ts
 * on the home page only, so inner pages never load GSAP.
 *
 * Everything runs inside gsap.matchMedia(). Each moment has its own condition
 * set, so crossing a breakpoint rebuilds only what depends on it. The site
 * Motion toggle (html[data-motion]) is the second key: on `wh:motionchange`
 * the whole matchMedia is reverted and rebuilt.
 *
 * Reduce branch: nothing animates (the CSS shows the static figures, static
 * brackets and fully inked statement). No Lenis, no pin, no SplitText.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { siteReduce } from './prefs';
import { detection, introLines } from './hero';
import { pipeline } from './pipeline';
import { indexHover } from './index-hover';
import { rail } from './rail';
import { statement } from './statement';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const MOTION = '(prefers-reduced-motion: no-preference)';

/** Resolve on fonts.ready, but never wait longer than `ms` (content never waits). */
const fontsReady = (ms: number) =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, ms))]);

let introPlayed = false;

function build(): gsap.MatchMedia {
  const mm = gsap.matchMedia();
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const pipe = document.querySelector<HTMLElement>('[data-pipe]');
  const work = document.querySelector<HTMLElement>('[data-work]');
  const fill = document.querySelector<HTMLElement>('[data-fill]');

  // Hero: line reveal (first load only) + detection pass, ALL devices
  if (hero) {
    mm.add(MOTION, () => {
      if (siteReduce()) return;
      // Only animate the intro while start states are still applied (js-motion);
      // if the 3s safety already showed everything, don't hide it again.
      if (!introPlayed && root.classList.contains('js-motion')) introLines(hero);
      else hero.querySelectorAll('[data-split-lines]').forEach((el) => el.classList.add('is-split'));
      const stop = detection(hero, { delay: introPlayed ? 0.3 : 0.95 });
      introPlayed = true;
      return stop;
    });
  }

  // [01] Pin: desktop + motion
  if (pipe) {
    mm.add(`${MOTION} and (min-width: 1024px)`, () => {
      if (siteReduce()) return;
      return pipeline(pipe);
    });
  }

  // [02] Index: plate on desktop fine pointers; rail lock-on elsewhere
  if (work) {
    mm.add(`${MOTION} and (min-width: 1024px) and (hover: hover) and (pointer: fine)`, () => {
      if (siteReduce()) return;
      return indexHover(work);
    });
    mm.add(MOTION, () => {
      if (siteReduce()) return;
      return rail(work);
    });
  }

  // Statement word fill
  if (fill) {
    mm.add(MOTION, () => {
      if (siteReduce()) return;
      return statement(fill);
    });
  }

  return mm;
}

export async function initHome(): Promise<void> {
  await fontsReady(700);
  let mm = build();

  // Text metrics change once the web fonts land: re-measure every trigger
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  window.addEventListener('wh:motionchange', () => {
    mm.revert();
    mm = build();
    ScrollTrigger.refresh();
  });
}

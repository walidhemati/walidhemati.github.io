/**
 * Hero motion (plan 4.4 #3, #4).
 *
 *  introLines()  role line + lead reveal through line masks (yPercent 105 → 0,
 *                stagger .08) with SplitText {type:'lines', mask:'lines',
 *                aria:'none' on an aria-hidden host + sr-only copy, autoSplit:true,
 *                onSplit}. Runs once per page load.
 *  detection()   the signature detection pass: one bracket box (corners only)
 *                snaps onto "Computer vision" (cv), "Android" (android),
 *                "Shikenso" (shikenso) and rests on the status pill, while the
 *                [ Status ] label above the pill reads out "Detect · <key>"
 *                (the box never covers the text around it). ~3.2s, plays
 *                once, ⟲ Replay. Positions come from element rects and are
 *                recomputed on resize and after fonts load. The box is
 *                aria-hidden; labels are non-numeric (no fake confidence).
 *
 * The hero NAME is never touched here: it is the LCP element and paints at
 * frame 1 (its gated wdth settle is pure CSS, see motion.css).
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

const SNAP = 'back.out(1.7)'; // ≈ --ease-snap cubic-bezier(.3,1.4,.5,1)
const HOP = 'expo.inOut';

export function introLines(hero: HTMLElement): void {
  hero.querySelectorAll<HTMLElement>('[data-split-lines]').forEach((el, i) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      aria: 'none', // the host is aria-hidden; an sr-only copy carries the text
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        return gsap.from(self.lines, {
          yPercent: 105,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.08,
          delay: 0.1 + i * 0.12,
        });
      },
    });
  });
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

export function detection(hero: HTMLElement, { delay = 1.25 }: { delay?: number } = {}): () => void {
  const box = hero.querySelector<HTMLElement>('[data-detect-box]');
  const label = hero.querySelector<HTMLElement>('[data-detect-label]');
  const replay = hero.querySelector<HTMLButtonElement>('[data-detect-replay]');
  if (!box || !label) return () => {};
  const corners = Array.from(box.querySelectorAll<HTMLElement>('.detect__c'));
  const ORDER = ['cv', 'shikenso', 'android', 'status'] as const;
  const C = 12;

  // Re-query every time: SplitText re-creates nested spans on re-split.
  const target = (key: string) => hero.querySelector<HTMLElement>(`[data-detect="${key}"]`);

  const rectOf = (key: string): Box | null => {
    const el = target(key);
    if (!el) return null;
    const h = hero.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const pad = key === 'status' ? 7 : 5;
    return { l: r.left - h.left - pad, t: r.top - h.top - pad, r: r.right - h.left + pad, b: r.bottom - h.top + pad };
  };
  const cornerXY = (b: Box, j: number) => ({
    x: j % 2 === 0 ? b.l : b.r - C,
    y: j < 2 ? b.t : b.b - C,
  });
  const idle = label.textContent ?? '';
  const readout = (key: string | null) => {
    if (key === null) {
      label.textContent = idle;
      return;
    }
    const k = document.createElement('span');
    k.className = 'detect-key';
    k.textContent = key;
    label.replaceChildren('Detect · ', k);
  };

  const keys = ORDER.filter((k) => target(k));
  if (!keys.length) return () => {};

  const markDetected = (key: string | null) => {
    hero.querySelectorAll('[data-detect].is-detected').forEach((el) => el.classList.remove('is-detected'));
    if (key && key !== 'status') target(key)?.classList.add('is-detected');
  };

  let tl: gsap.core.Timeline | null = null;

  const snapTo = (key: string) => {
    const b = rectOf(key);
    if (!b) return;
    corners.forEach((c, j) => gsap.set(c, { ...cornerXY(b, j), opacity: 1, scale: 1 }));
    readout(key);
  };

  const play = (startDelay: number) => {
    tl?.kill();
    markDetected(null);
    hero.classList.add('is-detect-live');
    hero.classList.remove('is-detect-done');
    const t = gsap.timeline({
      delay: startDelay,
      onComplete: () => {
        markDetected(null);
        hero.classList.add('is-detect-done');
      },
    });

    keys.forEach((key, i) => {
      const val = (j: number, axis: 'x' | 'y') => {
        const b = rectOf(key);
        return b ? cornerXY(b, j)[axis] : 0;
      };
      const at = i === 0 ? 0 : '>';
      t.add(() => {
        readout(key);
        markDetected(key);
      }, at);

      if (i === 0) {
        // lock-on: corners close in from a wider box
        t.fromTo(
          corners,
          {
            x: (j: number) => val(j, 'x') + (j % 2 === 0 ? -18 : 18),
            y: (j: number) => val(j, 'y') + (j < 2 ? -14 : 14),
            opacity: 0,
          },
          { x: (j: number) => val(j, 'x'), y: (j: number) => val(j, 'y'), opacity: 1, duration: 0.5, ease: SNAP, immediateRender: false },
          '<',
        );
      } else {
        t.to(corners, { x: (j: number) => val(j, 'x'), y: (j: number) => val(j, 'y'), duration: 0.5, ease: HOP }, '<');
        // tiny overshoot on arrival = the snap
        t.fromTo(corners, { scale: 1.25 }, { scale: 1, duration: 0.25, ease: SNAP, immediateRender: false }, '>-0.08');
      }
      if (i < keys.length - 1) t.to({}, { duration: 0.26 });
    });
    tl = t;
  };

  // Keep the box glued to its target when the layout really changes (width).
  // Height-only resizes (mobile URL bar) and the initial observer call are ignored.
  let raf = 0;
  let lastW = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (!hero.classList.contains('is-detect-live')) return;
      tl?.kill();
      tl = null;
      markDetected(null);
      snapTo('status');
      hero.classList.add('is-detect-done');
    });
  };
  window.addEventListener('resize', onResize);

  const onReplay = () => play(0.05);
  if (replay) {
    replay.hidden = false;
    replay.addEventListener('click', onReplay);
  }

  play(delay);

  return () => {
    tl?.kill();
    tl = null;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    markDetected(null);
    readout(null);
    hero.classList.remove('is-detect-live', 'is-detect-done');
    gsap.set(corners, { clearProps: 'all' });
    if (replay) {
      replay.hidden = true;
      replay.removeEventListener('click', onReplay);
    }
  };
}

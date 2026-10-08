/**
 * [01] Pin (plan 4.4 #10): the site's ONE pinned section. Desktop ≥1024px and
 * motion allowed only; everywhere else the CSS shows static stacked figures.
 *
 *  - pin: true for 120% of the viewport (≤150vh), progress hairline on scrub .6
 *  - the active step only moves emphasis; all four step texts stay in the DOM
 *    and visible (Ctrl+F, screen readers)
 *  - ScrollTrigger.refresh() runs after fonts load (home.ts)
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function pipeline(section: HTMLElement): () => void {
  const stage = section.querySelector<HTMLElement>('[data-pipe-stage]');
  const fig = section.querySelector<HTMLElement>('[data-pipe-fig]');
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-pipe-step]'));
  const count = section.querySelector<HTMLElement>('[data-pipe-count]');
  const bar = section.querySelector<HTMLElement>('[data-pipe-progress]');
  if (!stage || !fig || !steps.length) return () => {};

  // Layout switch first, so ScrollTrigger measures the pinned layout
  section.classList.add('is-pinned');

  let current = -1;
  const setStep = (i: number) => {
    if (i === current) return;
    current = i;
    fig.dataset.step = String(i);
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    if (count) count.textContent = String(i + 1);
  };
  setStep(0);

  const n = steps.length;
  const st = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: '+=120%',
    pin: true,
    anticipatePin: 1,
    refreshPriority: 1, // the pin is measured before the statement trigger below it
    invalidateOnRefresh: true,
    onUpdate: (self) => setStep(Math.min(n - 1, Math.floor(self.progress * n * 0.999 + 0.0001))),
  });

  const progress = bar
    ? gsap.fromTo(
        bar,
        { scaleX: 0 },
        { scaleX: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top top', end: '+=120%', scrub: 0.6 } },
      )
    : null;

  return () => {
    progress?.scrollTrigger?.kill();
    progress?.kill();
    st.kill();
    section.classList.remove('is-pinned');
    fig.dataset.step = 'all';
    steps.forEach((s, k) => s.classList.toggle('is-active', k === 0));
    if (bar) gsap.set(bar, { clearProps: 'transform' });
  };
}

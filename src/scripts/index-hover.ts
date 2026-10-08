/**
 * Project index, desktop (plan 4.4 #12).
 *  (a) ink wipe + inverted text and (b) the wdth 85 → 100 stretch are CSS
 *      (:hover, :focus-visible), so they work without this script.
 *  (c) one shared 360×240 preview plate follows the cursor (quickTo ≈ lerp .12)
 *      and leans with horizontal velocity, clamped to ±6°.
 *  (d) brackets snap onto the plate (CSS transition on .is-on).
 * Only runs for a fine, hover-capable pointer at ≥1024px with motion allowed.
 * Without it, rows show a static thumbnail column instead (.has-plate absent).
 */
import { gsap } from 'gsap';

export function indexHover(section: HTMLElement): () => void {
  const list = section.querySelector<HTMLElement>('[data-idx]');
  const plate = section.querySelector<HTMLElement>('[data-plate]');
  const cap = section.querySelector<HTMLElement>('[data-plate-cap]');
  if (!list || !plate) return () => {};
  const covers = new Map(
    Array.from(plate.querySelectorAll<HTMLElement>('[data-plate-cover]')).map((el) => [el.dataset.plateCover!, el]),
  );

  section.classList.add('has-plate');
  const W = 360;
  const H = 240;
  const GAP = 28;

  const xTo = gsap.quickTo(plate, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(plate, 'y', { duration: 0.6, ease: 'power3' });
  const rTo = gsap.quickTo(plate, 'rotation', { duration: 0.5, ease: 'power3' });

  let on = false;
  let lastX = 0;
  let lastT = 0;
  let settle: gsap.core.Tween | null = null;

  // The plate lives between the titles (cols 2–7) and the meta (cols 8–10):
  // clamp it to columns 7–10 so it never covers a title.
  const lane = () => {
    const r = list.getBoundingClientRect();
    const link = list.querySelector<HTMLElement>('.idx__link');
    const gutter = link ? parseFloat(getComputedStyle(link).columnGap) || 0 : 0;
    const col = (r.width - 11 * gutter) / 12;
    const start7 = r.left + 6 * (col + gutter);
    const end10 = r.left + 10 * col + 9 * gutter;
    return { min: start7, max: Math.max(start7, end10 - W) };
  };
  const place = (cx: number, cy: number, instant = false) => {
    const { min, max } = lane();
    const x = gsap.utils.clamp(min, max, cx + GAP);
    const y = Math.max(8, Math.min(window.innerHeight - H - 8, cy - H / 2));
    if (instant) gsap.set(plate, { x, y, rotation: 0 });
    else {
      xTo(x);
      yTo(y);
    }
  };

  const show = (id: string, e: PointerEvent) => {
    covers.forEach((el, key) => el.classList.toggle('is-current', key === id));
    const row = list.querySelector<HTMLElement>(`[data-idx-row="${id}"]`);
    const name = covers.get(id)?.dataset.plateName ?? '';
    if (cap) cap.textContent = `${row?.querySelector('.idx__n')?.textContent ?? ''} · ${name}`;
    if (!on) {
      on = true;
      place(e.clientX, e.clientY, true);
      plate.classList.add('is-on');
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    place(e.clientX, e.clientY);
    const now = performance.now();
    const dt = Math.max(16, now - lastT);
    const vx = (e.clientX - lastX) / dt; // px per ms
    lastX = e.clientX;
    lastT = now;
    rTo(gsap.utils.clamp(-6, 6, vx * 9));
    settle?.kill();
    settle = gsap.delayedCall(0.12, () => rTo(0));
  };

  const onEnterRow = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const row = (e.currentTarget as HTMLElement).dataset.idxRow;
    if (row) show(row, e);
  };
  const onLeave = () => {
    on = false;
    plate.classList.remove('is-on');
    rTo(0);
  };

  const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-idx-row]'));
  rows.forEach((r) => r.addEventListener('pointerenter', onEnterRow));
  list.addEventListener('pointermove', onMove);
  list.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', onLeave, { passive: true });

  return () => {
    rows.forEach((r) => r.removeEventListener('pointerenter', onEnterRow));
    list.removeEventListener('pointermove', onMove);
    list.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', onLeave);
    settle?.kill();
    plate.classList.remove('is-on');
    section.classList.remove('has-plate');
    gsap.set(plate, { clearProps: 'transform' });
  };
}

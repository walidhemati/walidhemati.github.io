/**
 * Copy email (plan 4.4 #14). Any <button data-copy="value" data-copy-fallback="mailto:…">.
 * Clipboard API first; when it is missing or refused, fall back to the mailto link.
 * The toast is a role="status" live region and shows with or without motion.
 * No magnetic pull, no count-ups.
 */
export function initCopy(): void {
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  let hideTimer: number | undefined;

  const show = (visible: string, spoken: string) => {
    if (!toast) return;
    // clear first so a repeated message is announced again
    toast.textContent = '';
    toast.classList.remove('is-on');
    requestAnimationFrame(() => {
      toast.innerHTML = `<span aria-hidden="true">${visible}</span><span class="sr-only">${spoken}</span>`;
      toast.classList.add('is-on');
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => toast.classList.remove('is-on'), 2400);
    });
  };

  document.addEventListener('click', async (event) => {
    const btn = (event.target as Element | null)?.closest?.<HTMLElement>('[data-copy]');
    if (!btn) return;
    const value = btn.dataset.copy ?? '';
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('no clipboard');
      await navigator.clipboard.writeText(value);
      show('copied → clipboard', `${value} copied to the clipboard`);
      btn.classList.add('is-copied');
      window.setTimeout(() => btn.classList.remove('is-copied'), 1600);
    } catch {
      const fallback = btn.dataset.copyFallback;
      if (fallback) window.location.href = fallback;
    }
  });
}

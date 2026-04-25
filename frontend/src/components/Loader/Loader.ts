/**
 * Tiny imperative helper to toggle the `data-loading` overlay that lives
 * inside several pages' templates (a centred spinner over the content).
 *
 * Not strictly a Component — pages already include the overlay element
 * in their HTML, this just hides/shows it consistently.
 */

export const Loader = {
  show(el: HTMLElement | null | undefined): void {
    el?.classList.remove('hidden');
  },
  hide(el: HTMLElement | null | undefined): void {
    el?.classList.add('hidden');
  },
};

/**
 * Helpers for student profile pictures with a graceful fallback to
 * ui-avatars.com if the file isn't present on the backend.
 */

const PHOTO_BASE = 'http://localhost:5000/profilepics';
const FALLBACK_BASE = 'https://ui-avatars.com/api/';

export function profilePicUrl(enrollment: string): string {
  return `${PHOTO_BASE}/${enrollment.toLowerCase()}.jpg`;
}

export function fallbackAvatarUrl(name: string, size?: number): string {
  const params = new URLSearchParams({ name, background: 'random' });
  if (size) params.set('size', String(size));
  return `${FALLBACK_BASE}?${params.toString()}`;
}

/**
 * Build the inline `onerror` handler used inside templated `<img>` tags so a
 * single fallback path is consistent everywhere. Components that build rows
 * via DOM (not strings) should attach the listener directly instead.
 */
export function attachAvatarFallback(img: HTMLImageElement, name: string, size?: number): void {
  img.addEventListener(
    'error',
    () => {
      img.onerror = null;
      img.src = fallbackAvatarUrl(name, size);
    },
    { once: true }
  );
}

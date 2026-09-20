export const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window.location.protocol === 'https:' ? window.location.origin : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'))
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000');

export function getFullImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If current site is on HTTPS and image is HTTP on the same host, upgrade to HTTPS
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://' + window.location.hostname)) {
      return url.replace('http://', 'https://');
    }
    return url;
  }
  const cleanBase = (typeof window !== 'undefined' && window.location.protocol === 'https:')
    ? window.location.origin
    : API_BASE_URL.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

export const AUTH_COOKIE_NAME = 'auth_token';

export function getAuthTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + AUTH_COOKIE_NAME + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthTokenCookie(token: string, expiresAtMs?: number) {
  if (typeof document === 'undefined') return;
  const attrs = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'SameSite=Lax',
    location.protocol === 'https:' ? 'Secure' : '',
  ];
  if (expiresAtMs) {
    attrs.push(`Expires=${new Date(expiresAtMs).toUTCString()}`);
  }
  document.cookie = attrs.filter(Boolean).join('; ');
}

export function clearAuthTokenCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; ${location.protocol === 'https:' ? 'Secure' : ''}`;
}
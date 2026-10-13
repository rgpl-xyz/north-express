import type { HttpInterceptorFn } from '@angular/common/http';

/** Digitraffic asks clients to identify themselves with this header. */
export const DIGITRAFFIC_USER = 'rgpl-xyz/north-express';

const DIGITRAFFIC_DOMAIN = 'digitraffic.fi';

export function isDigitrafficUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const { protocol, hostname } = parsed;
  return (
    protocol === 'https:' &&
    (hostname === DIGITRAFFIC_DOMAIN || hostname.endsWith(`.${DIGITRAFFIC_DOMAIN}`))
  );
}

/** Adds the Digitraffic-User header to Digitraffic requests only. */
export const digitrafficUserInterceptor: HttpInterceptorFn = (request, next) =>
  isDigitrafficUrl(request.url)
    ? next(request.clone({ setHeaders: { 'Digitraffic-User': DIGITRAFFIC_USER } }))
    : next(request);

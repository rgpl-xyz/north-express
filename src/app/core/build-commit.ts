import { InjectionToken } from '@angular/core';
import { REPOSITORY_URL } from './app-info';

/** Set at build time by deploy/deploy.sh (`ng build --define`); undefined in any other build. */
declare const NORTH_EXPRESS_COMMIT: string | undefined;

/** The full commit this bundle was built from, or `dev` when the build named none. */
export const BUILD_COMMIT = new InjectionToken<string>('BUILD_COMMIT', {
  providedIn: 'root',
  factory: () => (typeof NORTH_EXPRESS_COMMIT === 'string' ? NORTH_EXPRESS_COMMIT : 'dev'),
});

export interface BuildLabel {
  readonly text: string;
  readonly href: string | null;
}

/** A full commit shows short and links to it on GitHub; anything else is an unlinked `dev`. */
export function buildLabel(commit: string): BuildLabel {
  return /^[0-9a-f]{40}$/.test(commit)
    ? { text: commit.slice(0, 7), href: `${REPOSITORY_URL}/commit/${commit}` }
    : { text: 'dev', href: null };
}

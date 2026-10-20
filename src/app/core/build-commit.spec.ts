import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BUILD_COMMIT, buildLabel } from './build-commit';

const SHA = '0e7c3f5b02f0a1b554fc1bf36a9ac1bea488c967';

describe('buildLabel', () => {
  it('shows the short commit and links the full one', () => {
    expect(buildLabel(SHA)).toEqual({
      text: '0e7c3f5',
      href: `https://github.com/rgpl-xyz/north-express/commit/${SHA}`,
    });
  });

  it('reads anything but a full commit as an unlinked dev build', () => {
    for (const value of [
      'dev',
      '',
      '0e7c3f5',
      SHA.toUpperCase(),
      `${SHA}0`,
      'javascript:alert(1)',
    ]) {
      expect(buildLabel(value)).toEqual({ text: 'dev', href: null });
    }
  });
});

describe('BUILD_COMMIT', () => {
  it('is dev when the build names no commit', () => {
    expect(TestBed.inject(BUILD_COMMIT)).toBe('dev');
  });
});

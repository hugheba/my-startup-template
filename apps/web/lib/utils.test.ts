import { describe, expect, it } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  // Guards the twMerge half of cn(). Plain clsx returns "px-2 px-4", which
  // Tailwind resolves by stylesheet order rather than call order — so every
  // `<Button className="px-4">` override in components/ui would stop working
  // and nothing else in the repo would notice.
  it('lets a later conflicting Tailwind class win', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('keeps non-conflicting classes and skips falsy values', () => {
    expect(cn('flex', undefined, 'gap-2')).toBe('flex gap-2');
  });
});

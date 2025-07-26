import { describe, expect, it } from 'vitest';
import { nook } from '../src/index.ts';

describe('using nooks', () => {
  it('should throw error top-level', () => {
    const fooNook = nook(() => 'foo' as const);

    expect(() => fooNook``()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot call nooks top-level, only within other nooks]`,
    );
  });
});

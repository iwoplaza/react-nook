import { useId } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { nook } from '../src/index.ts';

describe('using nooks', () => {
  it('should throw error top-level', () => {
    const fooNook = nook(() => 'foo' as const);

    expect(() => fooNook``()).toThrowErrorMatchingInlineSnapshot(
      `[Error: Nooks can only be called within other nooks, or via a \`useNook\` call]`,
    );
  });

  it('should throw error when used in a regular component', () => {
    const fooNook = nook(() => 'foo' as const);

    function Bar() {
      return <p>{fooNook``()}</p>;
    }

    expect(() => render(<Bar />)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Nooks can only be called within other nooks, or via a \`useNook\` call]`,
    );
  });

  it('should throw when using a non-supported hook', () => {
    const $foo = nook(() => {
      // The `useId` hook is not supported at the time of writing this test
      return useId();
    });

    const Bar = nook(() => {
      const id = $foo``();
      return <p>{id}</p>;
    });

    expect(() => render(<Bar />)).toThrowErrorMatchingInlineSnapshot(`[Error: Cannot use 'useId' inside nooks yet. Please file an issue and tell us about your use-case.]`);
  });
});

import { useEffect, useId } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { nook, useNook } from '../src/index.ts';

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

    expect(() => render(<Bar />)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Cannot use 'useId' inside nooks yet. Please file an issue and tell us about your use-case.]`,
    );
  });
});

describe('conditional based on prop', () => {
  let events: string[] = [];

  function useSideEffect() {
    useEffect(() => {
      events.push('mount');
      return () => {
        events.push('unmount');
      };
    });
  }

  const $sideEffect = nook(useSideEffect);

  function Foo(props: { active: boolean }) {
    useNook(() => {
      props.active && $sideEffect``();
    });

    return <p>Foo</p>;
  }

  beforeEach(() => {
    events = [];
  });

  it('should unmount when unmounting the owner component (was always active)', () => {
    const result = render(<Foo active={true} />);

    // Because of React Strict Mode, it does a quick mount&unmount before mounting for real
    expect(events).toMatchInlineSnapshot(`
      [
        "mount",
        "unmount",
        "mount",
      ]
    `);

    result.unmount();

    // An additional unmount can be seen
    expect(events).toMatchInlineSnapshot(`
      [
        "mount",
        "unmount",
        "mount",
        "unmount",
      ]
    `);
  });

  it('should never mount when active=false', () => {
    const result = render(<Foo active={false} />);

    expect(events).toMatchInlineSnapshot(`[]`);
    result.unmount();
    expect(events).toMatchInlineSnapshot(`[]`);
  });

  it('should mount when active becomes true, and unmount when it becomes false', () => {
    events = [];
    const result = render(<Foo active={false} />);
    expect(events).toMatchInlineSnapshot(`[]`);

    // Interestingly, the React Strict Mode behavior applies even to effects that have
    // been mounted later than the component itself.
    events = [];
    result.rerender(<Foo active={true} />);
    expect(events).toMatchInlineSnapshot(`
      [
        "mount",
        "unmount",
        "mount",
      ]
    `);

    // An additional unmount
    events = [];
    result.rerender(<Foo active={false} />);
    expect(events).toMatchInlineSnapshot(`
      [
        "unmount",
      ]
    `);

    // Interestingly, the React Strict Mode behavior applies even to effects that have
    // been mounted later than the component itself.
    events = [];
    result.rerender(<Foo active={true} />);
    expect(events).toMatchInlineSnapshot(`
      [
        "mount",
        "unmount",
        "mount",
      ]
    `);

    events = [];
    result.unmount();
    expect(events).toMatchInlineSnapshot(`
      [
        "unmount",
      ]
    `);
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { $memo, useNook } from '../src/index.ts';

describe('$memo nook', () => {
  it('should memoize values based on dependencies', () => {
    const factory = vi.fn(() => Math.random());

    function TestComponent({ value }: { value: number }) {
      const memoized = useNook(() => {
        return $memo``(() => factory(), [value]);
      });
      return <div>{memoized}</div>;
    }

    const { rerender } = render(<TestComponent value={1} />);
    expect(factory).toHaveBeenCalledTimes(1);
    const firstResult = factory.mock.results[0]?.value;

    rerender(<TestComponent value={1} />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent value={2} />);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(factory.mock.results[1]?.value).not.toBe(firstResult);
  });

  it('should recompute when dependencies change', () => {
    let computeCount = 0;
    const expensiveComputation = (input: number) => {
      computeCount++;
      return input * 2;
    };

    function TestComponent({ input }: { input: number }) {
      const result = useNook(() => {
        return $memo``(() => expensiveComputation(input), [input]);
      });
      return <div>{result}</div>;
    }

    const { rerender } = render(<TestComponent input={5} />);
    expect(computeCount).toBe(1);

    rerender(<TestComponent input={5} />);
    expect(computeCount).toBe(1);

    rerender(<TestComponent input={10} />);
    expect(computeCount).toBe(2);
  });

  it('should work without dependencies (always recompute)', () => {
    const factory = vi.fn(() => Math.random());

    function TestComponent() {
      const memoized = useNook(() => {
        return $memo``(() => factory());
      });
      return <div>{memoized}</div>;
    }

    const { rerender } = render(<TestComponent />);
    // React Strict Mode may cause double execution on first render
    const initialCallCount = factory.mock.calls.length;
    expect(initialCallCount).toBeGreaterThan(0);

    rerender(<TestComponent />);
    // Should have been called again since no deps means always recompute
    expect(factory).toHaveBeenCalledTimes(initialCallCount + 1);
  });

  it('should work with empty dependencies array', () => {
    const factory = vi.fn(() => Math.random());

    function TestComponent() {
      const memoized = useNook(() => {
        return $memo``(() => factory(), []);
      });
      return <div>{memoized}</div>;
    }

    const { rerender } = render(<TestComponent />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent />);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('should work with multiple dependencies', () => {
    const factory = vi.fn((a: number, b: string) => `${a}-${b}`);

    function TestComponent({ num, str }: { num: number; str: string }) {
      const memoized = useNook(() => {
        return $memo``(() => factory(num, str), [num, str]);
      });
      return <div>{memoized}</div>;
    }

    const { rerender } = render(<TestComponent num={1} str="a" />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent num={1} str="a" />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent num={2} str="a" />);
    expect(factory).toHaveBeenCalledTimes(2);

    rerender(<TestComponent num={2} str="b" />);
    expect(factory).toHaveBeenCalledTimes(3);
  });

  it('should work within useNook', () => {
    const factory = vi.fn(() => 'computed');

    function TestComponent({ value }: { value: number }) {
      const result = useNook(() => {
        return $memo``(() => factory(), [value]);
      });

      return <div>{result}</div>;
    }

    const { rerender } = render(<TestComponent value={1} />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent value={1} />);
    expect(factory).toHaveBeenCalledTimes(1);

    rerender(<TestComponent value={2} />);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('should throw error when used outside nook context', () => {
    expect(() => $memo``(() => 'test', [])).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid state]`,
    );
  });
});

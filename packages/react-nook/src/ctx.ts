import type { Scope } from './types.ts';

export const CTX: {
  parentScope: Scope | undefined;
  /**
   * Used to track whether or not we already requested a re-render during the... render.
   * Because we use a flip-flop mechanism, this is required.
   */
  rerenderRequested: boolean;
  rerender: ((...args: never[]) => unknown) | undefined;
} = {
  parentScope: undefined,
  rerender: undefined,
  rerenderRequested: false,
};

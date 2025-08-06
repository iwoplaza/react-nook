import type { RootScope, Scope } from './types.ts';

export const CTX: {
  rootScope: RootScope | undefined;
  parentScope: Scope | undefined;
  /**
   * Used to track whether or not we already requested a re-render during the... render.
   * Because we use a flip-flop mechanism, this is required.
   */
  rerenderRequested: boolean;
  rerender: ((...args: never[]) => unknown) | undefined;
} = {
  rootScope: undefined,
  parentScope: undefined,
  rerender: undefined,
  rerenderRequested: false,
};

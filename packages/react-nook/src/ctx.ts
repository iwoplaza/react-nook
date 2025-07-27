import type { Scope } from './types.ts';

export const CTX: {
  parentScope: Scope | undefined;
  rerender: ((...args: never[]) => unknown) | undefined;
} = {
  parentScope: undefined,
  rerender: undefined,
};

import type { Setter } from './types.ts';

export function callExpressionTrackedCallback<T>(
  callId: object,
  initial: T,
): readonly [T, Setter<T>] {
  throw new Error('Not implemented yet');
}

export function callOrderTrackedCallback<T>(
  initial: T,
): readonly [T, Setter<T>] {
  throw new Error('Not implemented yet');
}

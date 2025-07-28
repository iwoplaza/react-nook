import { CTX } from './ctx.ts';
import type { Setter, StateStore } from './types.ts';

export function callExpressionTrackedState<T>(
  callId: object,
  initial: T,
): readonly [T, Setter<T>] {
  if (typeof window === 'undefined') {
    // We're on the server, just return the initial value and a noop
    return [initial, () => {}];
  }

  const rerender = CTX.rerender;
  const scope = CTX.parentScope;

  if (!scope) {
    throw new Error('Invalid state');
  }

  let cachedStore = scope.children.get(callId) as StateStore | undefined;
  if (!cachedStore) {
    const store: StateStore<T> = {
      value: initial,
      setter: (valueOrCompute: T | ((prev: T) => T)) => {
        if (typeof valueOrCompute === 'function') {
          store.value = (valueOrCompute as (prev: T) => T)(store.value);
        } else {
          store.value = valueOrCompute as T;
        }
        rerender?.();
      },
    };
    cachedStore = store;
    scope.children.set(callId, store);
  } else {
    // Please don't delete me during this render
    scope.scheduledUnmounts.delete(callId);
  }

  return [cachedStore.value, cachedStore.setter];
}

export function callOrderTrackedState<T>(initial: T): readonly [T, Setter<T>] {
  const rerender = CTX.rerender;
  const scope = CTX.parentScope;

  if (!scope) {
    throw new Error('Invalid state');
  }

  const hookIdx = ++scope.lastHookIndex;
  let cachedStore = scope.hookStores[hookIdx] as StateStore | undefined;
  if (!cachedStore) {
    const store: StateStore<T> = {
      value: initial,
      setter(valueOrCompute) {
        if (typeof valueOrCompute === 'function') {
          store.value = (valueOrCompute as (prev: T) => T)(store.value);
        } else {
          store.value = valueOrCompute as T;
        }
        rerender?.();
      },
    };
    cachedStore = store;
    scope.hookStores[hookIdx] = store;
  }

  return [cachedStore.value, cachedStore.setter];
}

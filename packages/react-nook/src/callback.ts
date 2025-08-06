import { CTX } from './ctx.ts';
import type { AnyFn, CallbackStore } from './types.ts';

export function callExpressionTrackedCallback<T extends AnyFn>(
  callId: object,
  callback: T,
  deps: unknown[] | undefined,
): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error('Invalid state');
  }

  let store = scope.children.get(callId) as CallbackStore<T> | undefined;
  if (!store) {
    store = {
      callback,
      deps,
    };
    scope.children.set(callId, store);
  } else {
    // Please don't delete me during this render
    scope.scheduledDestroys.delete(callId);
  }

  // Comparing with the previous render
  if (
    // Not tracking deps?
    !store.deps ||
    !deps ||
    // Deps changed?
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    store.callback = callback;
  }

  return store.callback;
}

export function callOrderTrackedCallback<T>(
  callback: T,
  deps: unknown[] | undefined,
): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error('Invalid state');
  }

  const hookIdx = ++scope.lastHookIndex;
  let store = scope.hookStores[hookIdx] as CallbackStore<T> | undefined;
  if (!store) {
    store = {
      callback,
      deps,
    };
    scope.hookStores[hookIdx] = store;
  }

  // Comparing with the previous render
  if (
    // Not tracking deps?
    !store.deps ||
    !deps ||
    // Deps changed?
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    store.callback = callback;
  }

  return store.callback;
}

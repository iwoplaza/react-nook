import { CTX } from './ctx.ts';
import type { MemoStore } from './types.ts';

export function callExpressionTrackedMemo<T>(
  callId: object,
  factory: () => T,
  deps: unknown[] | undefined,
): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error('Invalid state');
  }

  let store = scope.children.get(callId) as MemoStore<T> | undefined;
  if (!store) {
    store = {
      value: factory(),
      deps,
    };
    scope.children.set(callId, store);
  } else {
    scope.scheduledDestroys.delete(callId);
  }

  if (
    !store.deps ||
    !deps ||
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    store.value = factory();
    store.deps = deps;
  }

  return store.value;
}

export function callOrderTrackedMemo<T>(
  factory: () => T,
  deps: unknown[] | undefined,
): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error('Invalid state');
  }

  const hookIdx = ++scope.lastHookIndex;
  let store = scope.hookStores[hookIdx] as MemoStore<T> | undefined;
  if (!store) {
    store = {
      value: factory(),
      deps,
    };
    scope.hookStores[hookIdx] = store;
  }

  if (
    !store.deps ||
    !deps ||
    store.deps.length !== deps.length ||
    store.deps.some((v, idx) => deps[idx] !== v)
  ) {
    store.value = factory();
    store.deps = deps;
  }

  return store.value;
}

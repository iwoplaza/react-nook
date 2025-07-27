import { useCallback, useState } from 'react';
import { CTX } from './ctx.ts';
import { mockHooks } from './hook-mock.ts';
import type { EffectCleanup, EffectStore, Scope, Setter } from './types.ts';

function createScope(): Scope {
  return {
    nested: new Map(),
    stateStores: new Map(),
    effectStores: new Map(),

    nestedToUnmount: new Set(),
    stateStoresToUnmount: new Set(),
    effectStoresToUnmount: new Set(),
  };
}

function destroyEffectStore(store: EffectStore) {
  store.cleanup?.();
}

function destroyScope(scope: Scope) {
  for (const nested of scope.nested.values()) {
    destroyScope(nested);
  }
  for (const store of scope.effectStores.values()) {
    destroyEffectStore(store);
  }
}

function setupScope<T>(cb: () => T): T {
  const scope = CTX.parentScope;
  if (!scope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }

  scope.nestedToUnmount = new Set(scope.nested.keys());
  scope.stateStoresToUnmount = new Set(scope.stateStores.keys());
  scope.effectStoresToUnmount = new Set(scope.effectStores.keys());

  const result = cb();

  // Deleting all stores that have not checked in
  for (const callId of scope.nestedToUnmount) {
    const scopeToDestroy = scope.nested.get(callId);
    scopeToDestroy && destroyScope(scopeToDestroy);
    scope.nested.delete(callId);
  }
  for (const callId of scope.stateStoresToUnmount) {
    scope.stateStores.delete(callId);
  }
  for (const callId of scope.effectStoresToUnmount) {
    const storeToDestroy = scope.effectStores.get(callId);
    storeToDestroy && destroyEffectStore(storeToDestroy);
    scope.effectStores.delete(callId);
  }

  return result;
}

function useTopLevelScope<T>(cb: () => T): T {
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  CTX.rerender = useCallback(() => {
    if (CTX.rerenderRequested) return;

    rerender((prev) => 1 - prev);
    CTX.rerenderRequested = true;
  }, []);

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  CTX.parentScope = scope;
  CTX.rerenderRequested = false;

  const result = setupScope(cb);

  // Cleanup
  CTX.parentScope = undefined;
  CTX.rerender = undefined;

  return result;
}

function withScope<T>(callId: object, callback: () => T): T {
  if (!CTX.parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }
  let scope = CTX.parentScope.nested.get(callId);
  if (!scope) {
    scope = createScope();
    CTX.parentScope.nested.set(callId, scope);
  } else {
    // Please don't delete me during this render
    CTX.parentScope.nestedToUnmount.delete(callId);
  }
  const prevParentScope = CTX.parentScope;
  CTX.parentScope = scope;
  const unmock = mockHooks();
  const result = setupScope(callback);
  unmock();
  CTX.parentScope = prevParentScope;
  return result;
}

function askState<T>(callId: object, initial: T): readonly [T, Setter<T>] {
  const rerender = CTX.rerender;

  if (!CTX.parentScope) {
    throw new Error('Invalid state');
  }

  let cachedStore = CTX.parentScope.stateStores.get(callId);
  if (!cachedStore) {
    const store = {
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
    CTX.parentScope.stateStores.set(callId, store);
  } else {
    // Please don't delete me during this render
    CTX.parentScope.stateStoresToUnmount.delete(callId);
  }

  return [cachedStore.value, cachedStore.setter];
}

function askEffect(
  callId: object,
  callback: () => EffectCleanup,
  deps: unknown[] | undefined,
): void {
  if (!CTX.parentScope) {
    throw new Error('Invalid state');
  }

  let store = CTX.parentScope.effectStores.get(callId);
  if (!store) {
    // First time mounting this effect!
    const cleanup = callback();
    store = {
      deps,
      cleanup,
    };
    CTX.parentScope.effectStores.set(callId, store);
  } else {
    // Please don't unmount me during this render
    CTX.parentScope.effectStoresToUnmount.delete(callId);
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
    store.cleanup?.(); // cleanup old effect
    store.cleanup = callback();
  }
}

export const nookState =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    askState(strings, initial);

export const nookEffect =
  (strings: TemplateStringsArray) =>
  (callback: () => EffectCleanup, deps?: unknown[] | undefined) =>
    askEffect(strings, callback, deps);

interface Nook<TArgs extends unknown[], TReturn> {
  (strings: TemplateStringsArray): (...args: TArgs) => TReturn;
  (...args: TArgs): TReturn;
}

export const nook = <TArgs extends unknown[], TReturn>(
  def: (...args: TArgs) => TReturn,
): Nook<TArgs, TReturn> => {
  return ((maybeStrings: unknown) => {
    if (Array.isArray(maybeStrings)) {
      // Calling it as a nook inside another nook, with the foo``() syntax
      // ---

      return (...args: TArgs) =>
        withScope(maybeStrings, () => {
          return def(...args);
        });
    }

    // Calling it as a component
    // ---

    // @ts-ignore: let's assume that if not called using the foo``() syntax, it's being called as a component
    // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
    return useTopLevelScope(() => def(maybeStrings));
  }) as Nook<TArgs, TReturn>;
};

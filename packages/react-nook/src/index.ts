import { useCallback, useState } from 'react';
import { CTX } from './ctx.ts';
import { mockHooks } from './hook-mock.ts';
import type { Scope, Setter } from './types.ts';

function createScope(): Scope {
  return {
    stateStores: new Map(),
    nested: new Map(),
    stateStoresToUnmount: new Set(),
    nestedToUnmount: new Set(),
  };
}

function setupScope<T>(cb: () => T): T {
  if (!CTX.parentScope) {
    throw new Error(
      'Nooks can only be called within other nooks, or via a `useNook` call',
    );
  }

  CTX.parentScope.stateStoresToUnmount = new Set(
    CTX.parentScope.stateStores.keys(),
  );
  CTX.parentScope.nestedToUnmount = new Set(CTX.parentScope.nested.keys());

  const result = cb();

  // Deleting all stores that have not checked in
  for (const callId of CTX.parentScope.stateStoresToUnmount) {
    CTX.parentScope.stateStores.delete(callId);
  }
  for (const callId of CTX.parentScope.nestedToUnmount) {
    CTX.parentScope.nested.delete(callId);
  }

  return result;
}

function useTopLevelScope<T>(cb: () => T): T {
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [, rerender] = useState(0);
  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  CTX.rerender = useCallback(() => {
    rerender((prev) => 1 - prev);
  }, []);

  // biome-ignore lint/correctness/useHookAtTopLevel: this is not a normal component
  const [scope] = useState(createScope);
  CTX.parentScope = scope;

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

export const nookState =
  (strings: TemplateStringsArray) =>
  <T>(initial: T) =>
    askState(strings, initial);

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
